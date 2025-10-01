import {
  BUTTON,
  DIV,
  FORM,
  H3,
  IMG,
  INPUT,
  LABEL,
  P,
  SCRIPT,
  SECTION,
  SPAN,
  UL,
  LI,
  SELECT,
  OPTION,
} from "@fartlabs/htx";
import type { FileMetadata } from "#/lib/file-manager.ts";

export interface FileManagerProps {
  formId: string;
  existingFiles: FileMetadata[];
}

export function FileManager(props: FileManagerProps) {
  return (
    <SECTION class="file-manager">
      <DIV class="card">
        <DIV class="card-header">
          <H3 class="card-title">Preview Files</H3>
          <P class="text-muted mb-0">
            Upload images or PDFs to preview this form
          </P>
        </DIV>

        <DIV class="file-upload-section">
          <FORM id="file-upload-form" class="upload-form" enctype="multipart/form-data">
            <INPUT type="hidden" name="formId" value={props.formId} />
            
            <DIV class="form-group">
              <LABEL for="file-input" class="file-input-label">
                Choose File
              </LABEL>
              <INPUT
                type="file"
                id="file-input"
                name="file"
                accept="image/*,.pdf"
                class="file-input"
                required
              />
            </DIV>

            <DIV class="form-group">
              <LABEL for="preview-type" class="form-label">File Type</LABEL>
              <SELECT id="preview-type" name="previewType" class="form-select">
                <OPTION value="image">Image Preview</OPTION>
                <OPTION value="pdf">PDF Document</OPTION>
              </SELECT>
            </DIV>

            <BUTTON type="submit" class="btn btn-primary">
              Upload File
            </BUTTON>
          </FORM>
        </DIV>

        <DIV class="file-list-section">
          <H3>Current Files</H3>
          {props.existingFiles.length > 0 ? (
            <UL class="file-list" id="file-list">
              {props.existingFiles.map((file) => (
                <LI class="file-item" data-filename={file.filename}>
                  <DIV class="file-preview">
                    {file.previewType === 'image' ? (
                      <IMG
                        src={`/api/files/${file.filename}`}
                        alt={file.originalName}
                        class="file-thumbnail"
                        loading="lazy"
                      />
                    ) : (
                      <DIV class="file-icon pdf-icon">
                        <SPAN>PDF</SPAN>
                      </DIV>
                    )}
                  </DIV>
                  <DIV class="file-info">
                    <P class="file-name">{file.originalName}</P>
                    <P class="file-meta">
                      {file.previewType} • {(file.size / 1024).toFixed(1)} KB
                    </P>
                  </DIV>
                  <BUTTON
                    type="button"
                    class="btn btn-danger btn-sm delete-file-btn"
                    data-filename={file.filename}
                  >
                    Delete
                  </BUTTON>
                </LI>
              ))}
            </UL>
          ) : (
            <P class="text-muted">No files uploaded yet.</P>
          )}
        </DIV>
      </DIV>

      <FileManagerScript />
    </SECTION>
  );
}

export function FileManagerScript() {
  return <SCRIPT type="module">{fileManagerScript}</SCRIPT>;
}

const fileManagerScript = `
class FileManager {
  constructor() {
    this.form = document.getElementById('file-upload-form');
    this.fileList = document.getElementById('file-list');
    this.fileInput = document.getElementById('file-input');
    
    this.init();
  }

  init() {
    if (this.form) {
      this.form.addEventListener('submit', this.handleUpload.bind(this));
    }
    
    // Add delete button listeners
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-file-btn')) {
        this.handleDelete(e.target.dataset.filename);
      }
    });
  }

  async handleUpload(e) {
    e.preventDefault();
    
    const formData = new FormData(this.form);
    const submitBtn = this.form.querySelector('button[type="submit"]');
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    
    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.addFileToList(result.metadata);
        this.form.reset();
        this.showMessage('File uploaded successfully!', 'success');
      } else {
        this.showMessage('Upload failed: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.showMessage('Upload failed: ' + error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload File';
    }
  }

  async handleDelete(filename) {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/files/${filename}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.removeFileFromList(filename);
        this.showMessage('File deleted successfully!', 'success');
      } else {
        this.showMessage('Delete failed: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      this.showMessage('Delete failed: ' + error.message, 'error');
    }
  }

  addFileToList(metadata) {
    if (!this.fileList) return;
    
    const fileItem = document.createElement('li');
    fileItem.className = 'file-item';
    fileItem.dataset.filename = metadata.filename;
    
    const preview = metadata.previewType === 'image' 
      ? `<img src="${metadata.url}" alt="${metadata.originalName}" class="file-thumbnail" loading="lazy">`
      : `<div class="file-icon pdf-icon"><span>PDF</span></div>`;
    
    fileItem.innerHTML = `
      <div class="file-preview">${preview}</div>
      <div class="file-info">
        <p class="file-name">${metadata.originalName}</p>
        <p class="file-meta">${metadata.previewType} • ${(metadata.size / 1024).toFixed(1)} KB</p>
      </div>
      <button type="button" class="btn btn-danger btn-sm delete-file-btn" data-filename="${metadata.filename}">
        Delete
      </button>
    `;
    
    this.fileList.appendChild(fileItem);
  }

  removeFileFromList(filename) {
    const fileItem = this.fileList?.querySelector(`[data-filename="${filename}"]`);
    if (fileItem) {
      fileItem.remove();
    }
  }

  showMessage(message, type) {
    // Create or update message element
    let messageEl = document.getElementById('file-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'file-message';
      messageEl.className = 'alert';
      document.querySelector('.file-manager').prepend(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.className = `alert alert-${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (messageEl) {
        messageEl.remove();
      }
    }, 5000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FileManager();
});
`;