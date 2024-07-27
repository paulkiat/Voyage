class Modal {
    constructor(id) {
        this.id = id;
        this.element = document.getElementById(id);
    }

    show() {
        if (this.element) {
            this.element.classList.remove('hidden');
            this.element.setAttribute('aria-hidden', 'false');
        }
    }

    hide() {
        if (this.element) {
            this.element.classList.add('hidden');
            this.element.setAttribute('aria-hidden', 'true');
        }
    }
}

function createModal(id, title, content) {
    const existingModal = document.getElementById(id);
    if (existingModal) {
        return new Modal(id);
    }

    const modal = document.createElement('div');
    modal.className = 'modal hidden';
    modal.id = id;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="modal-content">
            <button class="close" aria-label="Close">&times;</button>
            <h2>${title}</h2>
            ${content}
        </div>
    `;
    document.body.appendChild(modal);

    const closeButton = modal.querySelector('.close');
    closeButton.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    });

    return new Modal(id);
}

export { Modal, createModal };