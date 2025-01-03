import { TripPlanner } from '../components/planning/trip-planner.js';
import { Explorer } from '../components/navigation/explorer.js';
import { ProfileEditor } from '../components/user/profile-editor.js';
import { Modal } from '../components/shared/modal.js';
import Notifications from '../components/shared/notifications.js';
import { $ } from './lib/utils.js';

export class SPA {
    constructor() {
        this.routes = {};
        this.currentComponent = null;
        this.loadingOverlay = $('loading-overlay');
        this.loadingMessage = $('loading-message');
        this.feedbackModal = new Modal('feedback-modal');
        this.notifications = new Notifications(); // Initialize Notifications
        this.initRoutes();
        this.initNav();
        this.initHamburger();
        this.initFeedback();
        this.initAlerts();
        this.showComponent('home');
    }

    initRoutes() {
        this.routes = {
            'home': new Component('home'),
            'plan': new Component('plan'),
            'explore': new Component('explore'),
            'profile': new Component('profile'),
            'alerts': new Component('alerts'),
        };
    }

    initNav() {
        document.querySelectorAll('nav ul li a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.target.getAttribute('href').slice(1);
                this.showComponent(targetId);
            });
        });
    }

    initHamburger() {
        const hamburger = document.querySelector('.hamburger');
        const navLinksContainer = document.querySelector('nav ul');

        if (hamburger && navLinksContainer) {
            hamburger.addEventListener('click', () => {
                navLinksContainer.classList.toggle('active');
            });
        }
    }

    initFeedback() {
        const feedbackButton = $('feedback-button');
        const closeButton = document.querySelector('.modal .close');
        const stars = document.querySelectorAll('.star');
        const submitFeedbackButton = document.querySelector('.modal-content .submit-button');

        if (feedbackButton) {
            feedbackButton.addEventListener('click', () => {
                this.feedbackModal.show();
                this.feedbackModal.element.setAttribute('aria-hidden', 'false');
            });
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.feedbackModal.hide();
                this.feedbackModal.element.setAttribute('aria-hidden', 'true');
            });
        }

        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = star.getAttribute('data-rating');
                stars.forEach((s, index) => {
                    if (index < rating) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            });
        });

        if (submitFeedbackButton) {
            submitFeedbackButton.addEventListener('click', () => {
                const feedback = $('feedback-text').value;
                const rating = document.querySelectorAll('.star.active').length;
                if (feedback && rating) {
                    this.feedbackModal.hide();
                    this.feedbackModal.element.setAttribute('aria-hidden', 'true');
                    this.showLoading('Submitting feedback...');
                    setTimeout(() => {
                        this.hideLoading();
                        alert('Feedback submitted successfully!');
                    }, 1000);
                } else {
                    alert('Please provide feedback and a rating before submitting.');
                }
            });
        }
    }

    initAlerts() {
        const alertContainer = document.querySelector('.alert-container');
        if (alertContainer) {
            const alerts = [
                { message: 'Flight delayed by 2 hours.', time: '2 hours ago' },
                { message: 'New travel advisory for your destination.', time: '1 day ago' },
            ];
            alertContainer.innerHTML = alerts.map(alert => `
                <div class="alert">
                    <p>${alert.message}</p>
                    <small>${alert.time}</small>
                </div>
            `).join('');
        }
    }

    showLoading(message = 'Loading...') {
        if (this.loadingMessage && this.loadingOverlay) {
            this.loadingMessage.textContent = message;
            this.loadingOverlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
    }

    showComponent(componentId) {
        if (this.currentComponent) {
            this.currentComponent.hide();
        }
        this.currentComponent = this.routes[componentId];
        this.currentComponent.show();
        document.querySelectorAll('nav ul li a').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href').slice(1) === componentId);
        });
    }
}

class Component {
    constructor(id) {
        this.id = id;
        this.element = $(id);
    }

    show() {
        if (this.element) {
            this.element.classList.add('active');
        }
    }

    hide() {
        if (this.element) {
            this.element.classList.remove('active');
        }
    }
}