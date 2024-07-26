const UserProfile = (() => {
    let profileData = {};

    function init() {
        profileData = State.getCurrentState().userProfile;
        render();
        setupEventListeners();
    }

    function render() {
        const container = document.getElementById('user-profile');
        container.innerHTML = `
            <h2>User Profile</h2>
            <form id="profile-form">
                <label for="name">Name:</label>
                <input type="text" id="name" name="name" value="${profileData.name || ''}">
                
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" value="${profileData.email || ''}">
                
                <label for="preferences">Travel Preferences:</label>
                <textarea id="preferences" name="preferences">${profileData.preferences || ''}</textarea>
                
                <button type="submit">Save Profile</button>
            </form>
        `;
    }

    function setupEventListeners() {
        document.getElementById('profile-form').addEventListener('submit', handleSubmit);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        profileData = Object.fromEntries(formData);
        
        try {
            await API.post('/user-profile', profileData);
            State.updateUserProfile(profileData);
            Notifications.show('Profile saved successfully!');
        } catch (error) {
            Notifications.show('Failed to save profile. Please try again.', 'error');
        }
    }

    return {
        init
    };
})();