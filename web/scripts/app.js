document.addEventListener('DOMContentLoaded', () => {
    const routes = {
        dashboard: 'components/dashboard.html',
        profile: 'components/profile.html',
        preferences: 'components/preferences.html',
        packages: 'components/packages.html',
        customTrip: 'components/custom-trip.html',
        support: 'components/support.html'
    };

    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-body');
    const closeBtn = document.querySelector('.close');

    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    async function navigate(route) {
        const response = await fetch(routes[route]);
        const html = await response.text();
        modalContent.innerHTML = html;
        modal.style.display = 'block';
        if (route === 'dashboard') {
            setupDashboard();
        }
    }

    function setupDashboard() {
        function updateRealTime() {
            document.querySelector('.real-time-updates').innerText = 'Real-time update at ' + new Date().toLocaleTimeString();
        }
        setInterval(updateRealTime, 60000);
        document.querySelector('.book-now').addEventListener('click', () => {
            alert('Booking process initiated!');
        });
        updateRealTime();
    }

    document.querySelectorAll('[data-route]').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const route = event.target.getAttribute('data-route');
            navigate(route);
        });
    });

    const initialRoute = window.location.hash.replace('#', '') || 'dashboard';
    navigate(initialRoute);
});