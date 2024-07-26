document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    UserProfile.init();
    VacationPackages.init();
    BookingEngine.init();
    ItineraryOptimizer.init();
    Notifications.init();

    // Setup navigation
    setupNavigation();

    // Connect WebSocket
    WebSocketClient.connect();
});

function setupNavigation() {
    const nav = document.getElementById('main-nav');
    const components = ['user-profile', 'vacation-packages', 'booking-engine', 'itinerary-optimizer'];
    
    components.forEach(component => {
        const button = document.createElement('button');
        button.textContent = component.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        button.addEventListener('click', () => showComponent(component));
        nav.appendChild(button);
    });

    // Show default component
    showComponent('user-profile');
}

function showComponent(componentId) {
    document.querySelectorAll('.component').forEach(comp => comp.style.display = 'none');
    document.getElementById(componentId).style.display = 'block';
}