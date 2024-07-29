export function showNotification(app) {
    const notificationModal = app.createModal('New Travel Deal!', `
        <p>We've found an amazing deal for your next trip! Check it out now!</p>
        <button id="deal-cta">View Deal</button>
    `);
    app.showModal(notificationModal);

    document.getElementById('deal-cta').addEventListener('click', () => {
        app.hideModal(notificationModal);
    });
}