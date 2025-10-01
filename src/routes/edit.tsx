import { Delete, Get, Post, Router } from "@fartlabs/rtx";
import {
  A,
  BUTTON,
  DIV,
  FORM,
  H1,
  INPUT,
  LABEL,
  P,
  SCRIPT,
  TABLE,
  TBODY,
  TD,
  TH,
  TR,
} from "@fartlabs/htx";
import { Layout } from "#/components/layout.tsx";
import { RedirectPage } from "#/components/redirect.tsx";
import { NotFoundPage } from "#/components/not-found.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import { catalogItemFormSchema, parseFormData } from "#/lib/validation.ts";

const catalogService = new KvCatalogService(kv);

export function EditPageRoute() {
  return (
    <Router>
      <Get
        pattern="/edit"
        handler={async (_ctx) => {
          const catalogItems = (await catalogService.getItems()) ?? [];

          return new Response(
            <EditPage items={catalogItems} />,
            { headers: { "Content-Type": "text/html" } },
          );
        }}
      />

      <Post
        pattern="/edit"
        handler={async (ctx) => {
          const formData = await ctx.request.formData();

          // Check the admin password from the form data.
          const secretPassword = formData.get("password") as string;
          const expectedPassword = Deno.env.get("SECRET_PASSWORD");

          if (!expectedPassword || secretPassword !== expectedPassword) {
            return new Response(
              <PasswordErrorPage />,
              {
                headers: { "Content-Type": "text/html" },
                status: 401,
              },
            );
          }

          // Parse and validate form data using Zod.
          const rawFormData = parseFormData(formData);

          // Remove password from form data before validation since it's not part of the catalog item schema.
          const { password: _, ...catalogData } = rawFormData;

          const validation = catalogItemFormSchema.safeParse(catalogData);

          if (!validation.success) {
            const errorMessage = validation.error.issues
              .map((err) => `${err.path.join(".")}: ${err.message}`)
              .join(", ");
            return new Response(
              JSON.stringify({
                success: false,
                error: `Validation failed: ${errorMessage}`,
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            );
          }

          const {
            formId,
            category,
            description,
            size,
            paper,
            color,
            sides,
            unit,
          } = validation.data;

          const url = new URL(ctx.request.url);
          const originalFormId = url.searchParams.get("formId");
          const catalogItems = (await catalogService.getItems()) ?? [];

          // Use the original formId from the URL to find the existing item, not the potentially changed formId from the form.
          // If no originalFormId is provided, this is a new item creation request.
          const existingItem = originalFormId
            ? catalogItems.find((item) => item.formId === originalFormId)
            : null;

          // Create the item data with validated inputs.
          const itemData: CatalogItem = {
            formId,
            category,
            description,
            size,
            paper,
            color,
            sides,
            unit,
            previews: existingItem ? existingItem.previews : [], // Keep existing previews or empty for new items.
          };

          let success: boolean;
          if (existingItem) {
            if (originalFormId && originalFormId !== formId) {
              // The formId has changed, so we need to handle this carefully to avoid data loss.
              // First, check if the new formId already exists.
              const newItemExists = catalogItems.find((item) =>
                item.formId === formId
              );
              if (newItemExists) {
                success = false; // Cannot change to an existing formId
              } else {
                // Safe to proceed: delete old item and create new one.
                const deleteSuccess = await catalogService.deleteItem(
                  originalFormId,
                );
                if (deleteSuccess) {
                  success = await catalogService.addItem(itemData);
                } else {
                  success = false;
                }
              }
            } else {
              // Update the existing item with the same formId.
              success = await catalogService.updateItem(formId, itemData);
            }
          } else {
            // Add a new item.
            success = await catalogService.addItem(itemData);
          }

          if (!success) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Failed to save item. Please try again.",
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 500,
              },
            );
          }

          return new Response(
            <RedirectPage redirectUrl={`/${formId}`} />,
            { headers: { "Content-Type": "text/html" } },
          );
        }}
      />

      <Get
        pattern="/edit/new"
        handler={(_ctx) => {
          return new Response(
            <CreateItemPage />,
            { headers: { "Content-Type": "text/html" } },
          );
        }}
      />

      <Get
        pattern="/edit/:formId"
        handler={async (ctx) => {
          const formId = ctx.params?.pathname.groups.formId;
          if (!formId) {
            return new Response(
              <RedirectPage redirectUrl="/edit" />,
              { headers: { "Content-Type": "text/html" } },
            );
          }

          const catalogItems = (await catalogService.getItems()) ?? [];
          const item = catalogItems.find((item) => item.formId === formId);

          if (!item) {
            return new Response(
              <NotFoundPage itemId={formId} />,
              {
                headers: { "Content-Type": "text/html" },
                status: 404,
              },
            );
          }

          return new Response(
            <EditItemPage item={item} />,
            { headers: { "Content-Type": "text/html" } },
          );
        }}
      />

      <Delete
        pattern="/edit/:formId"
        handler={async (ctx) => {
          const formId = ctx.params?.pathname.groups.formId;
          if (!formId) {
            return new Response(
              JSON.stringify({ success: false, error: "Form ID is required" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            );
          }

          // Check the admin password from the form data.
          const formData = await ctx.request.formData();
          const adminPassword = formData.get("password") as string;
          const expectedPassword = Deno.env.get("SECRET_PASSWORD");
          if (!expectedPassword || adminPassword !== expectedPassword) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid admin password",
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 401,
              },
            );
          }

          const success = await catalogService.deleteItem(formId);

          if (!success) {
            return new Response(
              JSON.stringify({ success: false, error: "Item not found" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 404,
              },
            );
          }

          return new Response(
            JSON.stringify({ success: true }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }}
      />
    </Router>
  );
}

interface EditPageProps {
  items: CatalogItem[];
}

export function EditPage(props: EditPageProps) {
  return (
    <Layout
      title="Edit Catalog Items"
      description="Edit and manage catalog items"
    >
      <DIV class="card">
        <DIV class="card-header">
          <H1 class="card-title">Edit Catalog Items</H1>
          <P class="text-muted mb-0">Manage your catalog items</P>
          <DIV class="mt-3">
            <A href="/edit/new" class="btn btn-primary">
              Create New Form
            </A>
          </DIV>
        </DIV>

        <TABLE>
          <TBODY>
            <TR>
              <TH>Form ID</TH>
              <TH>Description</TH>
              <TH>Category</TH>
              <TH>Actions</TH>
            </TR>
            {props.items
              .map((item) => (
                <TR>
                  <TD>
                    <A href={`/${item.formId}`}>{item.formId}</A>
                  </TD>
                  <TD>{item.description}</TD>
                  <TD>{item.category}</TD>
                  <TD>
                    <A href={`/edit/${item.formId}`} class="btn">
                      Edit
                    </A>
                  </TD>
                </TR>
              ))
              .join("")}
          </TBODY>
        </TABLE>
      </DIV>
    </Layout>
  );
}

interface EditItemPageProps {
  item: CatalogItem;
}

const editFormScript = `
async function handleEditFormSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const formId = formData.get('formId');
  
  if (!formId) {
    alert('Form ID is required');
    return false;
  }
  
  // Get the admin password from the form.
  const password = formData.get('password');
  if (!password) {
    alert('Admin password is required');
    return false;
  }
  
  // Submit the form data directly.
  try {
    const response = await fetch('/edit', {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      window.location.href = \`/\${formId}\`;
    } else {
      alert('Failed to update form. Please check your password and try again.');
    }
  } catch (error) {
    console.error('Error updating form:', error);
    alert('An error occurred while updating the form');
  }
  
  return true;
}

// Add an event listener when the page loads.
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('edit-form');
  if (form) {
    form.addEventListener('submit', handleEditFormSubmit);
  }
});
`;

export function EditItemPage(props: EditItemPageProps) {
  return (
    <Layout
      title={`Edit ${props.item.formId}`}
      description={`Edit ${props.item.formId} catalog item`}
      head={<SCRIPT>{deleteItemScript + editFormScript}</SCRIPT>}
    >
      <DIV class="card">
        <DIV class="card-header">
          <H1 class="card-title">Edit {props.item.formId}</H1>
          <P class="text-muted mb-0">Update catalog item details</P>
        </DIV>

        <FORM
          method="POST"
          action={`/edit?formId=${props.item.formId}`}
          id="edit-form"
        >
          <DIV class="form-group">
            <LABEL for="formId">Form ID</LABEL>
            <INPUT
              type="text"
              id="formId"
              name="formId"
              value={props.item.formId}
              required="required"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="description">Description</LABEL>
            <INPUT
              type="text"
              id="description"
              name="description"
              value={props.item.description}
              required="required"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="category">Category</LABEL>
            <INPUT
              type="text"
              id="category"
              name="category"
              value={props.item.category}
              required="required"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="size">Size</LABEL>
            <INPUT
              type="text"
              id="size"
              name="size"
              value={props.item.size}
              required="required"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="paper">Paper</LABEL>
            <INPUT
              type="text"
              id="paper"
              name="paper"
              value={props.item.paper}
              required="required"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="color">Color</LABEL>
            <INPUT
              type="text"
              id="color"
              name="color"
              value={props.item.color}
              required="required"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="sides">Sides</LABEL>
            <INPUT
              type="text"
              id="sides"
              name="sides"
              value={props.item.sides}
              required="required"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="unit">Unit</LABEL>
            <INPUT
              type="text"
              id="unit"
              name="unit"
              value={props.item.unit}
              required="required"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="password">Admin Password</LABEL>
            <INPUT
              type="password"
              id="password"
              name="password"
              required="required"
              placeholder="Enter admin password"
            />
          </DIV>

          <DIV class="form-actions">
            <DIV class="btn-group">
              <BUTTON type="submit" class="btn btn-primary">
                Update Item
              </BUTTON>
              <A href="/edit" class="btn btn-secondary">
                Cancel
              </A>
            </DIV>
            <BUTTON
              type="button"
              class="btn btn-danger"
              data-form-id={props.item.formId}
              onclick="handleDeleteClick(this)"
            >
              Delete Item
            </BUTTON>
          </DIV>
        </FORM>
      </DIV>
    </Layout>
  );
}

const deleteItemScript = `
async function deleteItem(formId) {
  const password = prompt('Enter admin password to delete this item:');
  if (!password) {
    return;
  }

  try {
    const formData = new FormData();
    formData.append('password', password);
    
    const response = await fetch(\`/edit/\${formId}\`, {
      method: 'DELETE',
      body: formData,
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Redirect to the edit page after successful deletion.
      window.location.href = '/edit';
    } else {
      alert('Failed to delete item: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    alert('An error occurred while deleting the item');
  }
}

function handleDeleteClick(button) {
  const formId = button.getAttribute('data-form-id');
  if (confirm('Are you sure you want to delete ' + formId + '? This action cannot be undone.')) {
    deleteItem(formId);
  }
}
`;

const createFormScript = `
async function checkFormIdExists(formId) {
  try {
    const response = await fetch(\`/edit/\${formId}\`);
    return response.status === 200;
  } catch (error) {
    console.error('Error checking form ID:', error);
    return false;
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const formId = formData.get('formId');
  
  if (!formId) {
    alert('Form ID is required');
    return false;
  }
  
  // Get the admin password from the form.
  const password = formData.get('password');
  if (!password) {
    alert('Admin password is required');
    return false;
  }
  
  // Check if the form ID already exists.
  const exists = await checkFormIdExists(formId);
  
  if (exists) {
    const confirmed = confirm(\`Form ID "\${formId}" already exists. Do you want to update it instead?\`);
    if (!confirmed) {
      return false;
    }
  } else {
    const confirmed = confirm(\`Form ID "\${formId}" does not exist. Do you want to create a new form with this ID?\`);
    if (!confirmed) {
      return false;
    }
  }
  
  // Submit the form data directly.
  try {
    const response = await fetch('/edit', {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      window.location.href = \`/\${formId}\`;
    } else {
      alert('Failed to submit form. Please check your password and try again.');
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('An error occurred while submitting the form');
  }
  
  return true;
}

// Add an event listener when the page loads.
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('create-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
});
`;

export function CreateItemPage() {
  return (
    <Layout
      title="Create New Form"
      description="Create a new catalog item"
      head={<SCRIPT>{createFormScript}</SCRIPT>}
    >
      <DIV class="card">
        <DIV class="card-header">
          <H1 class="card-title">Create New Form</H1>
          <P class="text-muted mb-0">Add a new form to the catalog</P>
        </DIV>

        <FORM method="POST" action="/edit" id="create-form">
          <DIV class="form-group">
            <LABEL for="formId">Form ID</LABEL>
            <INPUT
              type="text"
              id="formId"
              name="formId"
              required="required"
              placeholder="Enter unique form ID"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="description">Description</LABEL>
            <INPUT
              type="text"
              id="description"
              name="description"
              required="required"
              placeholder="Enter form description"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="category">Category</LABEL>
            <INPUT
              type="text"
              id="category"
              name="category"
              required="required"
              placeholder="Enter category"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="size">Size</LABEL>
            <INPUT
              type="text"
              id="size"
              name="size"
              required="required"
              placeholder="Enter size (e.g., 8.5 x 11)"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="paper">Paper</LABEL>
            <INPUT
              type="text"
              id="paper"
              name="paper"
              required="required"
              placeholder="Enter paper type"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="color">Color</LABEL>
            <INPUT
              type="text"
              id="color"
              name="color"
              required="required"
              placeholder="Enter color"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="sides">Sides</LABEL>
            <INPUT
              type="text"
              id="sides"
              name="sides"
              required="required"
              placeholder="Enter sides (e.g., Single, Double)"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="unit">Unit</LABEL>
            <INPUT
              type="text"
              id="unit"
              name="unit"
              required="required"
              placeholder="Enter unit (e.g., Each, Pack, Box)"
            />
          </DIV>

          <DIV class="form-group">
            <LABEL for="password">Admin Password</LABEL>
            <INPUT
              type="password"
              id="password"
              name="password"
              required="required"
              placeholder="Enter admin password"
            />
          </DIV>

          <DIV class="form-actions">
            <DIV class="btn-group">
              <BUTTON type="submit" class="btn btn-primary">
                Create Form
              </BUTTON>
              <A href="/edit" class="btn btn-secondary">
                Cancel
              </A>
            </DIV>
          </DIV>
        </FORM>
      </DIV>
    </Layout>
  );
}

export function PasswordErrorPage() {
  return (
    <Layout
      title="Access Denied"
      description="Invalid admin password"
    >
      <DIV class="card text-center">
        <DIV class="card-header">
          <H1 class="card-title">Access Denied</H1>
          <P class="text-muted mb-0">Invalid admin password</P>
        </DIV>

        <DIV class="card-body">
          <P class="text-muted">
            The admin password you entered is incorrect. Please try again.
          </P>
        </DIV>

        <DIV class="mt-4">
          <A href="/edit" class="btn btn-primary">
            Back to Edit Page
          </A>
        </DIV>
      </DIV>
    </Layout>
  );
}
