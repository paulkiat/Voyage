export class TripPlanner {
    constructor(app) {
        this.app = app;
        this.tripForm = document.getElementById('trip-form');
        this.itineraryResult = document.getElementById('itinerary-result');
        this.init();
    }

    init() {
        this.tripForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const destination = this.app.sanitizeInput(document.getElementById('destination').value);
            const startDate = this.app.sanitizeInput(document.getElementById('start-date').value);
            const endDate = this.app.sanitizeInput(document.getElementById('end-date').value);
            const budget = this.app.sanitizeInput(document.getElementById('budget').value);

            if (destination && startDate && endDate && budget) {
                this.app.showLoading('Generating itinerary...');
                setTimeout(() => {
                    this.app.hideLoading();
                    this.itineraryResult.innerHTML = `
                        <h3>Your Personalized Itinerary</h3>
                        <p>Destination: ${destination}</p>
                        <p>Dates: ${startDate} to ${endDate}</p>
                        <p>Budget: $${budget}</p>
                        <ul>
                            <li>Day 1: City tour and welcome dinner</li>
                            <li>Day 2: Museum visits and local cuisine experience</li>
                            <li>Day 3: Nature excursion and relaxation</li>
                        </ul>
                    `;
                    this.itineraryResult.classList.remove('hidden');
                }, 1500);
            } else {
                alert('Please fill in all fields before submitting.');
            }
        });
    }
}
