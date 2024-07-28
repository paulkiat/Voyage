import { SPA } from './spa.js'; // Import the SPA class
import { TripPlanner } from '../components/planning/trip-planner.js';
import { Explorer } from '../components/navigation/explorer.js';
import { ProfileEditor } from '../components/user/profile-editor.js';
import { initPWA } from './pwa.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = new SPA();
    new TripPlanner();
    new Explorer();
    new ProfileEditor();

    initPWA(); // Initialize PWA

    // Simulate a notification after 1 minute
    setTimeout(() => {
        const notificationModal = app.createModal('New Travel Deal!', `
            <p>We've found an amazing deal for your next trip! Check it out now!</p>
            <button class="cta-button" id="deal-cta">View Deal</button>
        `);
        app.showModal(notificationModal);

        document.getElementById('deal-cta').addEventListener('click', () => {
            app.hideModal(notificationModal);
        });
    }, 60000);
});