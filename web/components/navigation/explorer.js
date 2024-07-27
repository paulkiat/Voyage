export class Explorer {
    constructor(app) {
        this.app = app;
        this.exploreButton = document.getElementById('explore-button');
        this.exploreResults = document.getElementById('explore-results');
        this.init();
    }

    init() {
        this.exploreButton.addEventListener('click', () => {
            const searchTerm = this.app.sanitizeInput(document.getElementById('explore-search').value);
            if (searchTerm) {
                this.app.showLoading('Searching destinations...');
                setTimeout(() => {
                    this.app.hideLoading();
                    this.app.renderExploreResults([
                        `${searchTerm}, France`,
                        `${searchTerm} City, Japan`,
                        `New ${searchTerm}, USA`
                    ]);
                    this.exploreResults.classList.remove('hidden');
                }, 1000);
            } else {
                alert('Please enter a search term.');
            }
        });
    }
}