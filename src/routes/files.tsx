import { Get } from "@fartlabs/rtx";
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
  SPAN,
  UL,
} from "@fartlabs/htx";
import { Layout } from "#/components/layout.tsx";
import { RedirectPage } from "#/components/redirect.tsx";
import { NotFoundPage } from "#/components/not-found.tsx";
import { Modal, ModalScript, PasswordModal } from "#/components/modal.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import { CatalogFileType } from "#/lib/catalog.ts";

const catalogService = new KvCatalogService(kv);

const filesPageScript = `
async function handleUploadSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const imageFiles = formData.getAll('image-files');
  const pdfFiles = formData.getAll('pdf-files');
  
  if (imageFiles.length === 0) {
    await showModal('confirmModal', 'Error', 'Please select at least one image file', 'OK', '');
    return false;
  }
  
  // Get password from user using modal
  const password = await showPasswordModal('passwordModal', 'Admin Password Required', 'Enter admin password to upload files:', 'Upload', 'Cancel');
  if (!password) {
    return false;
  }
  
  // Get formId from URL
  const pathParts = window.location.pathname.split('/');
  const formId = pathParts[pathParts.length - 1];
  
  if (!formId) {
    await showModal('confirmModal', 'Error', 'Form ID not found', 'OK', '');
    return false;
  }
  
  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Uploading...';
  
  const uploadData = new FormData();
  uploadData.append('password', password);
  imageFiles.forEach(file => uploadData.append('image-files', file));
  pdfFiles.forEach(file => uploadData.append('pdf-files', file));
  
  try {
    const response = await fetch(\`/edit/\${formId}/previews\`, {
      method: 'POST',
      body: uploadData,
    });
    
    const result = await response.json();
    
    if (result.success) {
      window.location.reload();
    } else {
      await showModal('confirmModal', 'Error', 'Failed to upload files: ' + (result.error || 'Unknown error'), 'OK', '');
    }
  } catch (error) {
    console.error('Error uploading files:', error);
    await showModal('confirmModal', 'Error', 'An error occurred while uploading files', 'OK', '');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
  
  return true;
}


// Alt text editing functions
function updateAltText(src, originalAlt, newAlt, index) {
  const saveBtn = document.querySelector(\`#alt-\${index}\`).parentElement.querySelector('.save-alt-btn');
  const cancelBtn = document.querySelector(\`#alt-\${index}\`).parentElement.querySelector('.cancel-alt-btn');
  
  if (newAlt !== originalAlt) {
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
  } else {
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
  }
}

function cancelAltText(src, originalAlt, index) {
  const input = document.getElementById(\`alt-\${index}\`);
  const saveBtn = input.parentElement.querySelector('.save-alt-btn');
  const cancelBtn = input.parentElement.querySelector('.cancel-alt-btn');
  
  input.value = originalAlt;
  saveBtn.style.display = 'none';
  cancelBtn.style.display = 'none';
}

async function saveAltText(src, originalAlt, newAlt, index) {
  if (newAlt === originalAlt) {
    return;
  }
  
  // Get formId from URL
  const pathParts = window.location.pathname.split('/');
  const formId = pathParts[pathParts.length - 1];
  
  if (!formId) {
    alert('Form ID not found');
    return;
  }
  
  // Get password from user using custom modal
  const password = await showPasswordModal('passwordModal', 'Admin Password Required', 'Enter admin password to update alt text:', 'Update', 'Cancel');
  if (!password) {
    return;
  }
  
  const formData = new FormData();
  formData.append('password', password);
  formData.append('src', src);
  formData.append('alt', newAlt);
  
  try {
    const response = await fetch(\`/edit/\${formId}/alt-text\`, {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Hide save/cancel buttons
      const saveBtn = document.querySelector(\`#alt-\${index}\`).parentElement.querySelector('.save-alt-btn');
      const cancelBtn = document.querySelector(\`#alt-\${index}\`).parentElement.querySelector('.cancel-alt-btn');
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
      
      // Update the image alt attribute
      const img = document.querySelector(\`img[src="\${src}"]\`);
      if (img) {
        img.alt = newAlt;
      }
      
      alert('Alt text updated successfully');
    } else {
      alert('Failed to update alt text: ' + (result.error || 'Unknown error'));
      // Revert the input value
      document.getElementById(\`alt-\${index}\`).value = originalAlt;
    }
  } catch (error) {
    console.error('Error updating alt text:', error);
    alert('An error occurred while updating alt text');
    // Revert the input value
    document.getElementById(\`alt-\${index}\`).value = originalAlt;
  }
}

async function removePreviewFile(filename, type, isSeeded = false) {
  // Show confirmation dialog with different messages for seeded vs user files
  const message = isSeeded 
    ? \`Are you sure you want to remove the seeded file \${filename}? This will permanently delete it from the catalog. This action cannot be undone.\`
    : \`Are you sure you want to remove \${filename}? This action cannot be undone.\`;
  
  const confirmed = await showModal('confirmModal', 'Confirm Removal', message, 'Remove', 'Cancel');
  if (!confirmed) {
    return;
  }
  
  // Get password from user
  const password = await showPasswordModal('passwordModal', 'Admin Password Required', 'Enter admin password to remove this file:', 'Remove', 'Cancel');
  if (!password) {
    return;
  }
  
  // Get formId from URL
  const pathParts = window.location.pathname.split('/');
  const formId = pathParts[pathParts.length - 1];
  
  if (!formId) {
    await showModal('confirmModal', 'Error', 'Form ID not found', 'OK', '');
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
      await showModal('confirmModal', 'Error', 'Failed to remove file: ' + (result.error || 'Unknown error'), 'OK', '');
    }
  } catch (error) {
    console.error('Error removing file:', error);
    await showModal('confirmModal', 'Error', 'An error occurred while removing the file', 'OK', '');
  }
}

// Add event listeners when the page loads.
document.addEventListener('DOMContentLoaded', function() {
  const uploadForm = document.getElementById('upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUploadSubmit);
  }
  
  // Add event listeners for alt text inputs
  const altTextInputs = document.querySelectorAll('.alt-text-input');
  altTextInputs.forEach(input => {
    input.addEventListener('input', function() {
      const src = this.getAttribute('data-src');
      const originalAlt = this.getAttribute('data-original-alt');
      const newAlt = this.value;
      const index = this.getAttribute('data-index');
      updateAltText(src, originalAlt, newAlt, index);
    });
  });
  
  // Add event listeners for save buttons
  const saveButtons = document.querySelectorAll('.save-alt-btn');
  saveButtons.forEach(button => {
    button.addEventListener('click', function() {
      const src = this.getAttribute('data-src');
      const originalAlt = this.getAttribute('data-original-alt');
      const index = this.getAttribute('data-index');
      const input = document.getElementById(\`alt-\${index}\`);
      const newAlt = input.value;
      saveAltText(src, originalAlt, newAlt, index);
    });
  });
  
  // Add event listeners for cancel buttons
  const cancelButtons = document.querySelectorAll('.cancel-alt-btn');
  cancelButtons.forEach(button => {
    button.addEventListener('click', function() {
      const src = this.getAttribute('data-src');
      const originalAlt = this.getAttribute('data-original-alt');
      const index = this.getAttribute('data-index');
      cancelAltText(src, originalAlt, index);
    });
  });
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

.preview-item.seeded-file {
  background: #f0f8ff;
  border-color: #b3d9ff;
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

.seeded-badge {
  display: inline-block;
  background: #007bff;
  color: white;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
  font-weight: 500;
}

.preview-alt-text {
  margin: 8px 0;
}

.alt-label {
  display: block;
  font-size: 0.9em;
  font-weight: 500;
  color: #555;
  margin-bottom: 4px;
}

.alt-text-container {
  display: flex;
  gap: 8px;
  align-items: center;
}

.alt-text-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
}

.alt-text-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.save-alt-btn, .cancel-alt-btn {
  padding: 4px 8px;
  font-size: 0.8em;
  white-space: nowrap;
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

export function FileRoute() {
  return (
    <Get
      pattern="/files/:filename"
      handler={async (ctx) => {
        try {
          const filename = ctx.params?.pathname.groups.filename;
          if (!filename) {
            return new Response("Not Found", { status: 404 });
          }

          // Determine file type from extension - extract more robustly
          const lastDotIndex = filename.lastIndexOf(".");
          const ext = lastDotIndex !== -1
            ? filename.substring(lastDotIndex + 1).toLowerCase()
            : "";
          let fileType: CatalogFileType;
          let contentType: string;

          if (ext === "jpg" || ext === "jpeg") {
            fileType = CatalogFileType.JPG;
            contentType = "image/jpeg";
          } else if (ext === "webp") {
            fileType = CatalogFileType.WEBP;
            contentType = "image/webp";
          } else if (ext === "pdf") {
            fileType = CatalogFileType.PDF;
            contentType = "application/pdf";
          } else {
            return new Response("Unsupported file type", { status: 400 });
          }

          const fileData = await catalogService.getFile(fileType, filename);
          if (!fileData) {
            return new Response("File not found", { status: 404 });
          }

          return new Response(new Uint8Array(fileData), {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (error) {
          console.error("Error serving file:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      }}
    />
  );
}

export function FilesPageRoute() {
  return (
    <Get
      pattern="/manage-files/:formId"
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
          <FilesPage item={item} />,
          { headers: { "Content-Type": "text/html" } },
        );
      }}
    />
  );
}

interface FilesPageProps {
  item: CatalogItem;
}

export function FilesPage(props: FilesPageProps) {
  return (
    <Layout
      title={`Manage Files - ${props.item.formId}`}
      description={`Manage files for ${props.item.formId}`}
      head={<SCRIPT>{filesPageScript}</SCRIPT> + previewStyles +
        <ModalScript />}
    >
      <DIV class="card">
        <DIV class="card-header">
          <H1 class="card-title">Manage Files - {props.item.formId}</H1>
          <P class="text-muted mb-0">
            Upload and manage preview images and PDFs
          </P>
          <DIV class="mt-3">
            <A
              href={`/edit/${props.item.formId}`}
              class="btn btn-secondary"
              data-testid="back-to-edit-link"
              title="Go back to edit form"
            >
              ← Back to Edit Form
            </A>
          </DIV>
        </DIV>

        {props.item.previews.length > 0
          ? (
            <DIV class="card">
              <DIV class="card-header">
                <H2 class="card-title">Current Preview Files</H2>
                <P class="text-muted mb-0">
                  Manage existing preview images and PDFs
                </P>
              </DIV>
              <UL class="preview-list">
                {props.item.previews.map((preview, _index) => {
                  const isSeededFile = preview.src.startsWith(
                    "images/forms/reg/",
                  );

                  return (
                    <LI
                      class={`preview-item ${
                        isSeededFile ? "seeded-file" : ""
                      }`}
                    >
                      <DIV class="preview-content">
                        <IMG
                          src={preview.src.startsWith("/")
                            ? preview.src
                            : `/${preview.src}`}
                          alt={preview.alt}
                          class="preview-thumbnail"
                          loading="lazy"
                        />
                        <DIV class="preview-info">
                          <P class="preview-filename">
                            {preview.src.split("/").pop()}
                            {isSeededFile
                              ? <SPAN class="seeded-badge">Seeded</SPAN>
                              : ""}
                          </P>
                          <DIV class="preview-alt-text">
                            <LABEL for={`alt-${_index}`} class="alt-label">
                              Alt Text:
                            </LABEL>
                            <DIV class="alt-text-container">
                              <INPUT
                                type="text"
                                id={`alt-${_index}`}
                                value={preview.alt}
                                class="alt-text-input"
                                placeholder="Enter alt text for accessibility"
                                data-src={preview.src}
                                data-original-alt={preview.alt}
                                data-index={_index}
                              />
                              <BUTTON
                                type="button"
                                class="btn btn-sm btn-outline-primary save-alt-btn"
                                data-src={preview.src}
                                data-original-alt={preview.alt}
                                data-index={_index}
                                style="display: none;"
                              >
                                Save
                              </BUTTON>
                              <BUTTON
                                type="button"
                                class="btn btn-sm btn-outline-secondary cancel-alt-btn"
                                data-src={preview.src}
                                data-original-alt={preview.alt}
                                data-index={_index}
                                style="display: none;"
                              >
                                Cancel
                              </BUTTON>
                            </DIV>
                          </DIV>
                          {preview.pdf && (
                            <P class="preview-pdf">
                              PDF: {preview.pdf.split("/").pop()}
                              {preview.pdf.startsWith("images/forms/reg/") && (
                                <SPAN class="seeded-badge">Seeded</SPAN>
                              )}
                            </P>
                          )}
                        </DIV>
                        <DIV class="preview-actions">
                          <BUTTON
                            type="button"
                            class={`btn btn-sm ${
                              isSeededFile ? "btn-warning" : "btn-danger"
                            }`}
                            onclick={`removePreviewFile('${
                              preview.src.split("/").pop()
                            }', 'image', ${isSeededFile})`}
                            title={isSeededFile
                              ? "Remove this seeded file from the catalog (file will remain in system)"
                              : "Delete this uploaded file permanently"}
                          >
                            {isSeededFile
                              ? "Remove from Catalog"
                              : "Delete Image"}
                          </BUTTON>
                          {preview.pdf
                            ? (
                              <BUTTON
                                type="button"
                                class={`btn btn-sm ${
                                  preview.pdf.startsWith("images/forms/reg/")
                                    ? "btn-warning"
                                    : "btn-danger"
                                }`}
                                onclick={`removePreviewFile('${
                                  preview.pdf.split("/").pop()
                                }', 'pdf', ${isSeededFile})`}
                                title={preview.pdf.startsWith(
                                    "images/forms/reg/",
                                  )
                                  ? "Remove this seeded PDF from the catalog (file will remain in system)"
                                  : "Delete this uploaded PDF permanently"}
                              >
                                {preview.pdf.startsWith("images/forms/reg/")
                                  ? "Remove PDF from Catalog"
                                  : "Delete PDF"}
                              </BUTTON>
                            )
                            : ""}
                        </DIV>
                      </DIV>
                    </LI>
                  );
                })
                  .join("")}
              </UL>
            </DIV>
          )
          : ""}

        <DIV class="card">
          <DIV class="card-header">
            <H2 class="card-title">Upload New Files</H2>
            <P class="text-muted mb-0">Add images and PDFs for this form</P>
          </DIV>
          <FORM id="upload-form" enctype="multipart/form-data">
            <DIV class="form-group">
              <LABEL for="image-files">Image (Required)</LABEL>
              <INPUT
                type="file"
                id="image-files"
                name="image-files"
                multiple="multiple"
                accept=".jpg,.jpeg,.webp"
                required="required"
              />
              <P class="form-help">
                Select one image (.jpg, .webp) to display
              </P>
            </DIV>
            <DIV class="form-group">
              <LABEL for="pdf-files">PDF (Optional)</LABEL>
              <INPUT
                type="file"
                id="pdf-files"
                name="pdf-files"
                multiple="multiple"
                accept=".pdf"
              />
              <P class="form-help">
                Select one PDF file (.pdf) to associate with the image
              </P>
            </DIV>
            <DIV class="form-actions">
              <BUTTON type="submit" class="btn btn-primary">
                Upload Files
              </BUTTON>
            </DIV>
          </FORM>
        </DIV>
      </DIV>

      <Modal
        id="confirmModal"
        title="Confirm Removal"
        message="Are you sure you want to remove this file?"
        confirmText="Remove"
        cancelText="Cancel"
      />
      <PasswordModal
        id="passwordModal"
        title="Admin Password Required"
        message="Enter admin password to update alt text:"
        confirmText="Update"
        cancelText="Cancel"
      />
    </Layout>
  );
}
