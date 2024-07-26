const State = (() => {
    let state = {
        userProfile: {},
        currentItinerary: [],
        vacationPackages: []
    };

    function updateUserProfile(profileData) {
        state.userProfile = { ...state.userProfile, ...profileData };
    }

    function getCurrentState() {
        return { ...state };
    }

    function updateCurrentItinerary(itinerary) {
        state.currentItinerary = [...itinerary];
    }

    function updateVacationPackages(packages) {
        state.vacationPackages = [...packages];
    }

    return {
        updateUserProfile,
        getCurrentState,
        updateCurrentItinerary,
        updateVacationPackages
    };
})();