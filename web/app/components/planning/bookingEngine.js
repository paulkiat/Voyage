const BookingEngine = (() => {
    function init() {
        render();
        setupEventListeners();
    }

    function render() {
        const container = document.getElementById('booking-engine');
        container.innerHTML = `
            <h2>Booking Engine</h2>
            <form id="booking-form">
                <label for="destination">Destination:</label>
                <input type="text" id="destination" name="destination" required>
                
                <label for="check-in">Check-in Date:</label>
                <input type="date" id="check-in" name="check-in" required>
                
                <label for="check-out">Check-out Date:</label>
                <input type="date" id="check-out" name="check-out" required>
                
                <label for="guests">Number of Guests:</label>
                <input type="number" id="guests" name="guests" min="1" required>
                
                <button type="submit">Search</button>
            </form>
            <div id="search-results"></div>
        `;
    }

    function setupEventListeners() {
        document.getElementById('booking-form').addEventListener('submit', handleSearch);
    }

    async function handleSearch(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const searchParams = Object.fromEntries(formData);

        try {
            const results = await API.post('/search', searchParams);
            renderSearchResults(results);
        } catch (error) {
            Notifications.show('Failed to perform search. Please try again.', 'error');
        }
    }

    function renderSearchResults(results) {
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = results.map(result => `
            <div class="search-result">
                <h3>${result.name}</h3>
                <p>${result.description}</p>
                <p>Price: $${result.price}</p>
                <button class="book-result" data-id="${result.id}">Book Now</button>
            </div>
        `).join('');

        resultsContainer.addEventListener('click', handleResultBooking);
    }

    async function handleResultBooking(event) {
        if (event.target.classList.contains('book-result')) {
            const resultId = event.target.getAttribute('data-id');
            try {
                await API.post('/book', { resultId });
                Notifications.show('Booking successful!');
            } catch (error) {
                Notifications.show('Failed to complete booking. Please try again.', 'error');
            }
        }
    }

    return {
        init
    };
})();