const Notifications = (() => {
    const notificationsContainer = document.getElementById('notifications');
    const notifications = [];

    function init() {
        render();
    }

    function render() {
        notificationsContainer.innerHTML = notifications.map(notification => `
            <div class="notification ${notification.type}">
                ${notification.message}
            </div>
        `).join('');
    }

    function show(message, type = 'info') {
        notifications.push({ message, type });
        if (notifications.length > 3) {
            notifications.shift();
        }
        render();
        setTimeout(() => {
            notifications.pop();
            render();
        }, 5000);
    }

    return {
        init,
        show
    };
})();