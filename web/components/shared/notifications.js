class Notifications {
    static show(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <p>${message}</p>
            <button class="close-notification" aria-label="Close">&times;</button>
        `;

        const closeButton = notification.querySelector('.close-notification');
        closeButton.addEventListener('click', () => {
            notification.remove();
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000); // Auto-remove notification after 5 seconds
        
        self.addEventListener('push', event => {
            const data = event.data.json();
            self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/images/icon-192x192.png'
            });
        });
    }
}

export default Notifications;