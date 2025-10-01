import { Delete, Get, Post, Router } from "@fartlabs/rtx";
import {
  A,
  BUTTON,
  DIV,
  FORM,
  H1,
  H2,
  IMG,
  INPUT,
  LABEL,
  LI,
  P,
  SCRIPT,
  TABLE,
  TBODY,
  TD,
  TH,
  TR,
  UL,
} from "@fartlabs/htx";
import { Layout } from "#/components/layout.tsx";
import { RedirectPage } from "#/components/redirect.tsx";
import { NotFoundPage } from "#/components/not-found.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import { catalogItemFormSchema, parseFormData } from "#/lib/validation.ts";
import { CatalogFileType } from "#/lib/catalog.ts";

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

          // Handle different scenarios with specific error messages.
          if (existingItem) {
            if (originalFormId && originalFormId !== formId) {
              // The formId has changed, check if the new formId already exists.
              const newItemExists = catalogItems.find((item) =>
                item.formId === formId
              );
              if (newItemExists) {
                return new Response(
                  JSON.stringify({
                    success: false,
                    error:
                      `Form ID "${formId}" already exists. Please choose a different Form ID.`,
                  }),
                  {
                    headers: { "Content-Type": "application/json" },
                    status: 400,
                  },
                );
              }

              // Safe to proceed: delete old item and create new one.
              const deleteSuccess = await catalogService.deleteItem(
                originalFormId,
              );
              if (!deleteSuccess) {
                return new Response(
                  JSON.stringify({
                    success: false,
                    error:
                      "Failed to delete the original item. Please try again.",
                  }),
                  {
                    headers: { "Content-Type": "application/json" },
                    status: 500,
                  },
                );
              }

              const addSuccess = await catalogService.addItem(itemData);
              if (!addSuccess) {
                return new Response(
                  JSON.stringify({
                    success: false,
                    error:
                      "Failed to create the updated item. Please try again.",
                  }),
                  {
                    headers: { "Content-Type": "application/json" },
                    status: 500,
                  },
                );
              }
            } else {
              // Update the existing item with the same formId.
              const updateSuccess = await catalogService.updateItem(
                formId,
                itemData,
              );
              if (!updateSuccess) {
                return new Response(
                  JSON.stringify({
                    success: false,
                    error: "Failed to update the item. Please try again.",
                  }),
                  {
                    headers: { "Content-Type": "application/json" },
                    status: 500,
                  },
                );
              }
            }
          } else {
            // Add a new item and check if formId already exists.
            const itemExists = catalogItems.find((item) =>
              item.formId === formId
            );
            if (itemExists) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error:
                    `Form ID "${formId}" already exists. Please choose a different Form ID.`,
                }),
                {
                  headers: { "Content-Type": "application/json" },
                  status: 400,
                },
              );
            }

            const addSuccess = await catalogService.addItem(itemData);
            if (!addSuccess) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "Failed to create the new item. Please try again.",
                }),
                {
                  headers: { "Content-Type": "application/json" },
                  status: 500,
                },
              );
            }
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

      <Post
        pattern="/edit/:formId/previews"
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

          const formData = await ctx.request.formData();
          const password = formData.get("password") as string;
          const expectedPassword = Deno.env.get("SECRET_PASSWORD");
          if (!expectedPassword || password !== expectedPassword) {
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

          const files = formData.getAll("files") as File[];
          if (files.length === 0) {
            return new Response(
              JSON.stringify({ success: false, error: "No files provided" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            );
          }

          const catalogItems = (await catalogService.getItems()) ?? [];
          const item = catalogItems.find((item) => item.formId === formId);
          if (!item) {
            return new Response(
              JSON.stringify({ success: false, error: "Item not found" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 404,
              },
            );
          }

          const newPreviews = [...item.previews];

          for (const file of files) {
            const filename = file.name;
            const ext = filename.toLowerCase().split(".").pop();

            if (ext === "jpg" || ext === "jpeg") {
              const fileType = CatalogFileType.JPG;
              const data = new Uint8Array(await file.arrayBuffer());
              await catalogService.setFile(fileType, filename, data);

              newPreviews.push({
                src: `/files/${filename}`,
                alt: `${formId} preview`,
              });
            } else if (ext === "webp") {
              const fileType = CatalogFileType.WEBP;
              const data = new Uint8Array(await file.arrayBuffer());
              await catalogService.setFile(fileType, filename, data);

              newPreviews.push({
                src: `/files/${filename}`,
                alt: `${formId} preview`,
              });
            } else if (ext === "pdf") {
              const fileType = CatalogFileType.PDF;
              const data = new Uint8Array(await file.arrayBuffer());
              await catalogService.setFile(fileType, filename, data);

              // Try to link PDF to an image with same basename
              const basename = filename.replace(/\.pdf$/i, "");
              let linkedToImage = false;

              for (let i = newPreviews.length - 1; i >= 0; i--) {
                const preview = newPreviews[i];
                if (preview.src && !preview.pdf) {
                  const previewBasename = preview.src.split("/").pop()?.replace(
                    /\.(jpg|jpeg|webp)$/i,
                    "",
                  );
                  if (previewBasename === basename) {
                    newPreviews[i] = { ...preview, pdf: `/files/${filename}` };
                    linkedToImage = true;
                    break;
                  }
                }
              }

              // If no matching image found, link to the most recent image
              if (!linkedToImage) {
                for (let i = newPreviews.length - 1; i >= 0; i--) {
                  const preview = newPreviews[i];
                  if (preview.src && !preview.pdf) {
                    newPreviews[i] = { ...preview, pdf: `/files/${filename}` };
                    break;
                  }
                }
              }
            }
          }

          const updatedItem = { ...item, previews: newPreviews };
          const success = await catalogService.updateItem(formId, updatedItem);

          if (!success) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Failed to update item",
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 500,
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

      <Delete
        pattern="/edit/:formId/previews/:filename"
        handler={async (ctx) => {
          const formId = ctx.params?.pathname.groups.formId;
          const filename = ctx.params?.pathname.groups.filename;

          if (!formId || !filename) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Form ID and filename are required",
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            );
          }

          const formData = await ctx.request.formData();
          const password = formData.get("password") as string;
          const expectedPassword = Deno.env.get("SECRET_PASSWORD");
          if (!expectedPassword || password !== expectedPassword) {
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

          const catalogItems = (await catalogService.getItems()) ?? [];
          const item = catalogItems.find((item) => item.formId === formId);
          if (!item) {
            return new Response(
              JSON.stringify({ success: false, error: "Item not found" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 404,
              },
            );
          }

          const ext = filename.toLowerCase().split(".").pop();
          let fileType: CatalogFileType;

          if (ext === "jpg" || ext === "jpeg") {
            fileType = CatalogFileType.JPG;
          } else if (ext === "webp") {
            fileType = CatalogFileType.WEBP;
          } else if (ext === "pdf") {
            fileType = CatalogFileType.PDF;
          } else {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Unsupported file type",
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            );
          }

          // Remove file from KV
          await catalogService.removeFile(fileType, filename);

          // Update previews array
          const newPreviews = item.previews.filter((preview) => {
            if (ext === "pdf") {
              return preview.pdf !== `/files/${filename}`;
            } else {
              return preview.src !== `/files/${filename}`;
            }
          });

          // If removing an image, also remove any PDFs linked to it
          if (ext === "jpg" || ext === "jpeg" || ext === "webp") {
            const imageUrl = `/files/${filename}`;
            for (let i = 0; i < newPreviews.length; i++) {
              if (newPreviews[i].src === imageUrl) {
                newPreviews[i] = {
                  src: newPreviews[i].src,
                  alt: newPreviews[i].alt,
                };
                break;
              }
            }
          }

          const updatedItem = { ...item, previews: newPreviews };
          const success = await catalogService.updateItem(formId, updatedItem);

          if (!success) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Failed to update item",
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 500,
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

async function handleUploadSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const files = formData.getAll('files');
  const password = formData.get('password');
  
  if (files.length === 0) {
    alert('Please select at least one file');
    return false;
  }
  
  if (!password) {
    alert('Admin password is required');
    return false;
  }
  
  // Get formId from URL
  const pathParts = window.location.pathname.split('/');
  const formId = pathParts[pathParts.length - 1];
  
  if (!formId) {
    alert('Form ID not found');
    return false;
  }
  
  const uploadData = new FormData();
  uploadData.append('password', password);
  files.forEach(file => uploadData.append('files', file));
  
  try {
    const response = await fetch(\`/edit/\${formId}/previews\`, {
      method: 'POST',
      body: uploadData,
    });
    
    const result = await response.json();
    
    if (result.success) {
      window.location.reload();
    } else {
      alert('Failed to upload files: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error uploading files:', error);
    alert('An error occurred while uploading files');
  }
  
  return true;
}

async function removePreviewFile(filename, type) {
  const password = prompt('Enter admin password to remove this file:');
  if (!password) {
    return;
  }
  
  // Get formId from URL
  const pathParts = window.location.pathname.split('/');
  const formId = pathParts[pathParts.length - 1];
  
  if (!formId) {
    alert('Form ID not found');
    return;
  }
  
  const formData = new FormData();
  formData.append('password', password);
  
  try {
    const response = await fetch(\`/edit/\${formId}/previews/\${filename}\`, {
      method: 'DELETE',
      body: formData,
    });
    
    const result = await response.json();
    
    if (result.success) {
      window.location.reload();
    } else {
      alert('Failed to remove file: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error removing file:', error);
    alert('An error occurred while removing the file');
  }
}

// Add event listeners when the page loads.
document.addEventListener('DOMContentLoaded', function() {
  const editForm = document.getElementById('edit-form');
  if (editForm) {
    editForm.addEventListener('submit', handleEditFormSubmit);
  }
  
  const uploadForm = document.getElementById('upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUploadSubmit);
  }
});
`;

const previewStyles = `
<style>
.preview-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.preview-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 16px;
  background: #f9f9f9;
}

.preview-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.preview-thumbnail {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.preview-info {
  flex: 1;
}

.preview-filename {
  margin: 0 0 8px 0;
  font-weight: 500;
  color: #333;
}

.preview-pdf {
  margin: 0;
  color: #666;
  font-size: 0.9em;
}

.preview-actions {
  display: flex;
  gap: 8px;
  flex-direction: column;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 0.8em;
}

.form-help {
  margin-top: 4px;
  font-size: 0.9em;
  color: #666;
}
</style>
`;

export function EditItemPage(props: EditItemPageProps) {
  return (
    <Layout
      title={`Edit ${props.item.formId}`}
      description={`Edit ${props.item.formId} catalog item`}
      head={<SCRIPT>{deleteItemScript + editFormScript}</SCRIPT> +
        previewStyles}
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
        </FORM>

        {props.item.previews.length > 0
          ? (
            <DIV class="card">
              <DIV class="card-header">
                <H2 class="card-title">Preview Files</H2>
                <P class="text-muted mb-0">Manage preview images and PDFs</P>
              </DIV>
              <UL class="preview-list">
                {props.item.previews.map((preview, _index) => (
                  <LI class="preview-item">
                    <DIV class="preview-content">
                      <IMG
                        src={preview.src}
                        alt={preview.alt}
                        class="preview-thumbnail"
                        loading="lazy"
                      />
                      <DIV class="preview-info">
                        <P class="preview-filename">
                          {preview.src.split("/").pop()}
                        </P>
                        {preview.pdf && (
                          <P class="preview-pdf">
                            PDF: {preview.pdf.split("/").pop()}
                          </P>
                        )}
                      </DIV>
                      <DIV class="preview-actions">
                        <BUTTON
                          type="button"
                          class="btn btn-sm btn-danger"
                          onclick={`removePreviewFile('${
                            preview.src.split("/").pop()
                          }', 'image')`}
                        >
                          Remove Image
                        </BUTTON>
                        {preview.pdf && (
                          <BUTTON
                            type="button"
                            class="btn btn-sm btn-danger"
                            onclick={`removePreviewFile('${
                              preview.pdf.split("/").pop()
                            }', 'pdf')`}
                          >
                            Remove PDF
                          </BUTTON>
                        )}
                      </DIV>
                    </DIV>
                  </LI>
                ))}
              </UL>
            </DIV>
          )
          : ""}

        <DIV class="card">
          <DIV class="card-header">
            <H2 class="card-title">Upload Preview Files</H2>
            <P class="text-muted mb-0">Add images and PDFs for this form</P>
          </DIV>
          <FORM id="upload-form" enctype="multipart/form-data">
            <DIV class="form-group">
              <LABEL for="files">Files</LABEL>
              <INPUT
                type="file"
                id="files"
                name="files"
                multiple="multiple"
                accept=".jpg,.jpeg,.webp,.pdf"
                required="required"
              />
              <P class="form-help">
                Select multiple images (.jpg, .webp) and/or PDFs (.pdf)
              </P>
            </DIV>
            <DIV class="form-group">
              <LABEL for="upload-password">Admin Password</LABEL>
              <INPUT
                type="password"
                id="upload-password"
                name="password"
                required="required"
                placeholder="Enter admin password"
              />
            </DIV>
            <DIV class="form-actions">
              <BUTTON type="submit" class="btn btn-primary">
                Upload Files
              </BUTTON>
            </DIV>
          </FORM>
        </DIV>

        <FORM
          method="POST"
          action={`/edit?formId=${props.item.formId}`}
          id="edit-form"
        >
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
