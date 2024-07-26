const ItineraryOptimizer = (() => {
    let currentItinerary = [];

    function init() {
        currentItinerary = State.getCurrentState().currentItinerary;
        render();
        setupEventListeners();
    }

    function render() {
        const container = document.getElementById('itinerary-optimizer');
        container.innerHTML = `
            <h2>Itinerary Optimizer</h2>
            <div id="current-itinerary"></div>
            <button id="optimize-itinerary">Optimize Itinerary</button>
        `;
        renderCurrentItinerary();
    }

    function renderCurrentItinerary() {
        const itineraryContainer = document.getElementById('current-itinerary');
        itineraryContainer.innerHTML = currentItinerary.length ? currentItinerary.map(item => `
            <div class="itinerary-item">
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <p>Date: ${item.date}</p>
            </div>
        `).join('') : '<p>No itinerary items yet. Book some activities to get started!</p>';
    }

    function setupEventListeners() {
        document.getElementById('optimize-itinerary').addEventListener('click', optimizeItinerary);
    }

    async function optimizeItinerary() {
        try {
            const optimizedItinerary = await API.post('/optimize-itinerary', { itinerary: currentItinerary });
            currentItinerary = optimizedItinerary;
            State.updateCurrentItinerary(currentItinerary);
            renderCurrentItinerary();
            Notifications.show('Itinerary optimized successfully!');
        } catch (error) {
            Notifications.show('Failed to optimize itinerary. Please try again.', 'error');
        }
    }

    return {
        init
    };
})();