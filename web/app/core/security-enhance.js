import DOMPurify from 'dompurify'; // Correct the path
import { SPA } from './spa.js'; // Correct the path
import { $ } from './lib/utils.js';

export class SecurityEnhancedSPA extends SPA {
    constructor() {
        super();
        this.sanitizer = DOMPurify;
    }

    sanitizeInput(input) {
        return this.sanitizer.sanitize(input);
    }

    showLoading(message = 'Loading...') {
        if (this.loadingMessage && this.loadingOverlay) {
            this.loadingMessage.textContent = this.sanitizeInput(message);
            this.loadingOverlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
    }

    updateUserInfo(name, email, bio) {
        const sanitizedInfo = {
            name: this.sanitizeInput(name),
            email: this.sanitizeInput(email),
            bio: this.sanitizeInput(bio)
        };

        $('user-info').innerHTML = `
            <p><strong>Name:</strong> ${sanitizedInfo.name}</p>
            <p><strong>Email:</strong> ${sanitizedInfo.email}</p>
            <p><strong>Bio:</strong> ${sanitizedInfo.bio}</p>
        `;
    }

    renderExploreResults(results) {
        const sanitizedResults = results.map(result => this.sanitizeInput(result));
        const resultsList = sanitizedResults.map(result => `<li>${result}</li>`).join('');
        $('explore-results').innerHTML = `<ul>${resultsList}</ul>`;
    }

    showAlert(message) {
        const sanitizedMessage = this.sanitizeInput(message);
        const alertElement = document.createElement('div');
        alertElement.className = 'alert';
        alertElement.textContent = sanitizedMessage;
        document.querySelector('.alert-container').appendChild(alertElement);
    }
}