import { BUTTON, DIALOG, DIV, H4, INPUT, P, SCRIPT } from "@fartlabs/htx";

export interface ModalProps {
  id: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: string;
  onCancel?: string;
}

export function Modal(props: ModalProps) {
  const confirmText = props.confirmText || "OK";
  const cancelText = props.cancelText || "Cancel";

  return (
    <DIALOG id={props.id} class="modal-dialog">
      <DIV class="modal-content">
        <DIV class="modal-header">
          <H4 class="modal-title">{props.title}</H4>
          <BUTTON
            type="button"
            class="btn-close"
            onclick={`closeModal('${props.id}')`}
          >
            &times;
          </BUTTON>
        </DIV>
        <DIV class="modal-body">
          <P>{props.message}</P>
        </DIV>
        <DIV class="modal-footer">
          <BUTTON
            type="button"
            class="btn btn-secondary"
            onclick={`closeModal('${props.id}', false)`}
          >
            {cancelText}
          </BUTTON>
          <BUTTON
            type="button"
            class="btn btn-primary"
            onclick={`closeModal('${props.id}', true)`}
          >
            {confirmText}
          </BUTTON>
        </DIV>
      </DIV>
    </DIALOG>
  );
}

export function PasswordModal(
  props: {
    id: string;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  },
) {
  const confirmText = props.confirmText || "OK";
  const cancelText = props.cancelText || "Cancel";

  return (
    <DIALOG id={props.id} class="modal-dialog">
      <DIV class="modal-content">
        <DIV class="modal-header">
          <H4 class="modal-title">{props.title}</H4>
          <BUTTON
            type="button"
            class="btn-close"
            onclick={`closePasswordModal('${props.id}')`}
          >
            &times;
          </BUTTON>
        </DIV>
        <DIV class="modal-body">
          <P>{props.message}</P>
          <INPUT
            type="password"
            id={`${props.id}-password`}
            class="form-control"
            placeholder="Enter admin password"
            autofocus="autofocus"
          />
        </DIV>
        <DIV class="modal-footer">
          <BUTTON
            type="button"
            class="btn btn-secondary"
            onclick={`closePasswordModal('${props.id}', false)`}
          >
            {cancelText}
          </BUTTON>
          <BUTTON
            type="button"
            class="btn btn-primary"
            onclick={`closePasswordModal('${props.id}', true)`}
          >
            {confirmText}
          </BUTTON>
        </DIV>
      </DIV>
    </DIALOG>
  );
}

export function ModalScript() {
  return (
    <SCRIPT>
      {`
        let modalResolve = null;
        
        function showModal(modalId, title, message, confirmText = 'OK', cancelText = 'Cancel') {
          return new Promise((resolve) => {
            modalResolve = resolve;
            
            const modal = document.getElementById(modalId);
            const titleEl = modal.querySelector('.modal-title');
            const messageEl = modal.querySelector('.modal-body p');
            const confirmBtn = modal.querySelector('.btn-primary');
            const cancelBtn = modal.querySelector('.btn-secondary');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            confirmBtn.textContent = confirmText;
            cancelBtn.textContent = cancelText;
            
            modal.showModal();
          });
        }
        
        function closeModal(modalId, result = false) {
          const modal = document.getElementById(modalId);
          modal.close();
          
          if (modalResolve) {
            modalResolve(result);
            modalResolve = null;
          }
        }
        
        // Close modal when clicking outside (dialog backdrop)
        document.addEventListener('click', function(event) {
          if (event.target.tagName === 'DIALOG') {
            closeModal(event.target.id, false);
          }
        });
        
        // Close modal with Escape key (handled automatically by dialog)
        document.addEventListener('keydown', function(event) {
          if (event.key === 'Escape') {
            const openModal = document.querySelector('dialog[open]');
            if (openModal) {
              closeModal(openModal.id, false);
            }
          }
        });
        
        // Password modal functions
        let passwordModalResolve = null;
        
        function showPasswordModal(modalId, title, message, confirmText = 'OK', cancelText = 'Cancel') {
          return new Promise((resolve) => {
            passwordModalResolve = resolve;
            
            const modal = document.getElementById(modalId);
            const titleEl = modal.querySelector('.modal-title');
            const messageEl = modal.querySelector('.modal-body p');
            const confirmBtn = modal.querySelector('.btn-primary');
            const cancelBtn = modal.querySelector('.btn-secondary');
            const passwordInput = modal.querySelector('input[type="password"]');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            confirmBtn.textContent = confirmText;
            cancelBtn.textContent = cancelText;
            passwordInput.value = '';
            
            modal.showModal();
            // Focus is handled by autofocus attribute
          });
        }
        
        function closePasswordModal(modalId, result = false) {
          const modal = document.getElementById(modalId);
          const passwordInput = modal.querySelector('input[type="password"]');
          const password = passwordInput.value;
          
          modal.close();
          
          if (passwordModalResolve) {
            passwordModalResolve(result ? password : null);
            passwordModalResolve = null;
          }
        }
      `}
    </SCRIPT>
  );
}
