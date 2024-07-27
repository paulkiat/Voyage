import DOMPurify from 'dompurify';
import { SPA } from './index.js';

export class SecurityEnhancedSPA extends SPA {
    constructor() {
        super();
        this.routes = {};
        this.currentComponent = null;
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingMessage = document.getElementById('loading-message');
        this.sanitizer = DOMPurify;
        this.initRoutes();
        this.initNav();
        this.showComponent('home');
    }

    sanitizeInput(input) {
        return this.sanitizer.sanitize(input);
    }

    showLoading(message = 'Loading...') {
        this.loadingMessage.textContent = this.sanitizeInput(message);
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    updateUserInfo(name, email, bio) {
        const sanitizedInfo = {
            name: this.sanitizeInput(name),
            email: this.sanitizeInput(email),
            bio: this.sanitizeInput(bio)
        };

        document.getElementById('user-info').innerHTML = `
            <p><strong>Name:</strong> ${sanitizedInfo.name}</p>
            <p><strong>Email:</strong> ${sanitizedInfo.email}</p>
            <p><strong>Bio:</strong> ${sanitizedInfo.bio}</p>
        `;
    }

    renderExploreResults(results) {
        const sanitizedResults = results.map(result => this.sanitizeInput(result));
        const resultsList = sanitizedResults.map(result => `<li>${result}</li>`).join('');
        document.getElementById('explore-results').innerHTML = `<ul>${resultsList}</ul>`;
    }

    showAlert(message) {
        const sanitizedMessage = this.sanitizeInput(message);
        const alertElement = document.createElement('div');
        alertElement.className = 'alert';
        alertElement.textContent = sanitizedMessage;
        document.querySelector('.alert-container').appendChild(alertElement);
    }
}