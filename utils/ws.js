const WebSocketClient = (() => {
    let socket;

    function connect() {
        socket = new WebSocket('wss://your-websocket-server.com');

        socket.onopen = () => {
            console.log('WebSocket connection established');
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleMessage(data);
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
            setTimeout(connect, 5000); // Attempt to reconnect after 5 seconds
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    function handleMessage(data) {
        switch (data.type) {
            case 'itinerary_update':
                State.updateCurrentItinerary(data.itinerary);
                ItineraryOptimizer.init(); // Re-render the itinerary
                Notifications.show('Your itinerary has been updated!');
                break;
            case 'new_package':
                VacationPackages.fetchPackages(); // Fetch and re-render packages
                Notifications.show('New vacation package available!');
                break;
            // Add more cases as needed
        }
    }

    function sendMessage(message) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not open. Message not sent.');
        }
    }

    return {
        connect,
        sendMessage
    };
})();