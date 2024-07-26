const VacationPackages = (() => {
    let packages = [];

    function init() {
        fetchPackages();
        render();
        setupEventListeners();
    }

    async function fetchPackages() {
        try {
            packages = await API.get('/vacation-packages');
            State.updateVacationPackages(packages);
            render();
        } catch (error) {
            Notifications.show('Failed to fetch vacation packages. Please try again.', 'error');
        }
    }

    function render() {
        const container = document.getElementById('vacation-packages');
        container.innerHTML = `
            <h2>Vacation Packages</h2>
            <div id="packages-list"></div>
        `;
        renderPackages();
    }

    function renderPackages() {
        const packagesContainer = document.getElementById('packages-list');
        packagesContainer.innerHTML = packages.map(pkg => `
            <div class="package">
                <h3>${pkg.name}</h3>
                <p>${pkg.description}</p>
                <p>Price: $${pkg.price}</p>
                <button class="book-package" data-id="${pkg.id}">Book Now</button>
            </div>
        `).join('');
    }

    function setupEventListeners() {
        document.getElementById('vacation-packages').addEventListener('click', handlePackageBooking);
    }

    async function handlePackageBooking(event) {
        if (event.target.classList.contains('book-package')) {
            const packageId = event.target.getAttribute('data-id');
            try {
                await API.post('/book-package', { packageId });
                Notifications.show('Package booked successfully!');
            } catch (error) {
                Notifications.show('Failed to book package. Please try again.', 'error');
            }
        }
    }

    return {
        init
    };
})();