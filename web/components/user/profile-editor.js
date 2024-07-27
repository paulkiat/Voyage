export class ProfileEditor {
    constructor(app) {
        this.app = app;
        this.editProfileButton = document.getElementById('edit-profile');
        this.init();
    }

    init() {
        this.editProfileButton.addEventListener('click', () => {
            const modal = this.createModal('Edit Profile', `
                <form id="edit-profile-form">
                    <input type="text" id="name" placeholder="Name" required>
                    <input type="email" id="email" placeholder="Email" required>
                    <textarea id="bio" placeholder="Bio"></textarea>
                    <button type="submit">Save Changes</button>
                </form>
            `);
            document.body.appendChild(modal);
            this.showModal(modal);

            document.getElementById('edit-profile-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const name = this.app.sanitizeInput(document.getElementById('name').value);
                const email = this.app.sanitizeInput(document.getElementById('email').value);
                const bio = this.app.sanitizeInput(document.getElementById('bio').value);

                if (name && email) {
                    this.hideModal(modal);
                    this.app.updateUserInfo(name, email, bio);
                    alert('Profile updated successfully!');
                } else {
                    alert('Please fill in all required fields.');
                }
            });
        });
    }

    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close" aria-label="Close">&times;</button>
                <h2>${this.app.sanitizeInput(title)}</h2>
                ${content}
            </div>
        `;
        const closeButton = modal.querySelector('.close');
        closeButton.addEventListener('click', () => this.hideModal(modal));
        return modal;
    }

    showModal(modal) {
        modal.style.display = 'flex';
    }

    hideModal(modal) {
        modal.style.display = 'none';
        modal.remove();
    }
}