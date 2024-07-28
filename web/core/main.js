import './index.js';
import { SecurityEnhancedSPA } from './security-enhance.js';
import { TripPlanner } from '../components/planning/trip-planner.js';
import { Explorer } from '../components/navigation/explorer.js';
import { ProfileEditor } from '../components/user/profile-editor.js';
import { initPWA } from './pwa.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = new SecurityEnhancedSPA();
    new TripPlanner(app);
    new Explorer(app);
    new ProfileEditor(app);

    initPWA(); // Initialize PWA

    // Lazy load notification module
    setTimeout(() => {
        import('../components/shared/notifications.js').then(module => {
            module.default(app);
        });
    }, 60000);
});