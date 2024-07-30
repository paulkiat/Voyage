// Manages user session and keepalive for the AI Travel Companion application

import { LS } from './utils.js';

const context = {};

export default {
    init,
    get username() { return context.user; }
};

/**
 * Initializes the session and sets up keepalive.
 * @param {Object} api - Node/broker connector.
 * @param {Function} on_dead - Callback when session expires or is logged out.
 * @param {string} [uid] - Optional session id seed (for development direct url#hash).
 */
export function init(api, on_dead, uid) {
    context.api = api;
    context.on_dead = on_dead;
    if (uid) {
        LS.set("session", uid);
        console.log({ user_session: uid });
    }
    setInterval(session_keepalive, 5000);
    session_keepalive();
}

/**
 * Sends a keepalive request to maintain the session.
 */
function session_keepalive() {
    const sessionId = LS.get("session");
    if (!sessionId) {
        return context.on_dead();
    }
    context.api.pcall("user_auth", { sessionId })
        .then((msg, error) => {
            if (error) {
                return context.on_dead(error);
            }
            context.user = msg.user || '';
        })
        .catch(error => {
            context.on_dead(error);
        });
}