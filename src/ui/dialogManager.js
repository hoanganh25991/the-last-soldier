/**
 * Custom Dialog Manager
 * Replaces window.alert and window.confirm with styled UI dialogs
 */

export class DialogManager {
    constructor() {
        this.activeDialogs = [];
    }

    /**
     * Show an alert dialog (replaces window.alert)
     * @param {string} message - The message to display
     * @param {string} title - Optional title (default: "Alert")
     * @returns {Promise<void>}
     */
    async alert(message, title = 'Alert') {
        return new Promise((resolve) => {
            const dialog = this.createDialog(title, message, [
                { text: 'OK', action: () => resolve(), primary: true }
            ]);
            this.showDialog(dialog);
        });
    }

    /**
     * Show a confirm dialog (replaces window.confirm)
     * @param {string} message - The message to display
     * @param {string} title - Optional title (default: "Confirm")
     * @returns {Promise<boolean>} - true if confirmed, false if cancelled
     */
    async confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const dialog = this.createDialog(title, message, [
                { text: 'Cancel', action: () => resolve(false), primary: false },
                { text: 'OK', action: () => resolve(true), primary: true }
            ]);
            this.showDialog(dialog);
        });
    }

    /**
     * Create a dialog element
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {Array} buttons - Array of button configs {text, action, primary}
     * @returns {HTMLElement} - The dialog element
     */
    createDialog(title, message, buttons) {
        const dialogId = `dialog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';
        overlay.id = dialogId;
        
        const content = document.createElement('div');
        content.className = 'custom-dialog-content';
        
        const titleEl = document.createElement('h2');
        titleEl.className = 'custom-dialog-title';
        titleEl.textContent = title;
        
        const messageEl = document.createElement('p');
        messageEl.className = 'custom-dialog-message';
        messageEl.textContent = message;
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'custom-dialog-buttons';
        
        buttons.forEach((buttonConfig, index) => {
            const button = document.createElement('button');
            button.className = buttonConfig.primary 
                ? 'custom-dialog-btn custom-dialog-btn-primary' 
                : 'custom-dialog-btn custom-dialog-btn-secondary';
            button.textContent = buttonConfig.text;
            
            button.addEventListener('click', () => {
                buttonConfig.action();
                this.closeDialog(dialogId);
            });
            
            buttonsContainer.appendChild(button);
        });
        
        content.appendChild(titleEl);
        content.appendChild(messageEl);
        content.appendChild(buttonsContainer);
        overlay.appendChild(content);
        
        // Close on overlay click (outside content)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                // Only close if there's a cancel button or single OK button
                if (buttons.length === 1 || buttons.some(b => !b.primary)) {
                    const cancelButton = buttons.find(b => !b.primary);
                    if (cancelButton) {
                        cancelButton.action();
                    } else {
                        buttons[0].action();
                    }
                    this.closeDialog(dialogId);
                }
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                const cancelButton = buttons.find(b => !b.primary);
                if (cancelButton) {
                    cancelButton.action();
                } else {
                    buttons[0].action();
                }
                this.closeDialog(dialogId);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        return overlay;
    }

    /**
     * Show a dialog
     * @param {HTMLElement} dialog - The dialog element to show
     */
    showDialog(dialog) {
        document.body.appendChild(dialog);
        this.activeDialogs.push(dialog.id);
        
        // Trigger animation
        requestAnimationFrame(() => {
            dialog.classList.add('active');
        });
    }

    /**
     * Close a dialog
     * @param {string} dialogId - The ID of the dialog to close
     */
    closeDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
            dialog.classList.remove('active');
            setTimeout(() => {
                if (dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                }
                const index = this.activeDialogs.indexOf(dialogId);
                if (index > -1) {
                    this.activeDialogs.splice(index, 1);
                }
            }, 300); // Match CSS transition duration
        }
    }
}

// Create global instance
let dialogManagerInstance = null;

/**
 * Get or create the global dialog manager instance
 * @returns {DialogManager}
 */
export function getDialogManager() {
    if (!dialogManagerInstance) {
        dialogManagerInstance = new DialogManager();
    }
    return dialogManagerInstance;
}

// Export convenience functions
export async function showAlert(message, title) {
    return await getDialogManager().alert(message, title);
}

export async function showConfirm(message, title) {
    return await getDialogManager().confirm(message, title);
}

