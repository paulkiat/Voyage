/**
 * Service WebSocket links for organization servers
 * Handles secure communication, message synchronization, and state management
 */

const crypto = require('../lib/crypto');  // Import cryptographic functions
const util = require('../lib/util');      // Import utility functions
const log = util.logpre('link');          // Preconfigured logger
const { json, parse } = util;             // JSON utility functions
const connected = {};                     // Object to keep track of connected organizations
const context = {};                       // Context state

/**
 * Setup function to initialize WebSocket connection and handlers
 * @param {Object} state - The current state object
 * @param {WebSocket} ws - The WebSocket instance
 */
function setup(state, ws) {
    Object.assign(context, state);  // Merge state into context
    ws.on('message', (message) => {
        handleLink(state, parse(message), obj => {
            ws.send(json(obj));  // Send response back to WebSocket client
        }, ws);
    });
    ws.on('error', error => log({ ws_org_link_error: error }));  // Log WebSocket errors
}

/**
 * Handler function to process incoming WebSocket messages
 * @param {Object} state - The current state object
 * @param {Object} msg - The incoming message
 * @param {Function} send - Function to send response back
 * @param {WebSocket} socket - The WebSocket instance
 */
async function handleLink(state, msg, send, socket) {
    const { meta, logs } = state;  // Destructure state to get meta and logs
    const adminOrg = state.org_api.commands;  // Admin commands for organization API
    const sockStat = socket.stat = socket.stat || {
        sync: { last: undefined, timer: undefined, count: 0 }
    };  // Initialize socket statistics

    const { sync } = sockStat;
    const orgId = sockStat.org_id || msg.org_id;  // Get organization ID from socket or message
    const orgRec = sockStat.org_rec || await adminOrg.by_uid({ uid: orgId });  // Fetch organization record

    if (!orgRec) {
        log({ invalid_org_id: orgId });
        socket.close();  // Close socket if organization record is invalid
        return;
    }

    sockStat.ping = Date.now();  // Update ping timestamp

    if (msg.ping) return;  // Ignore ping messages

    if (msg.org_key_public) {
        orgRec.key_public = msg.org_key_public;  // Update public key if provided
    }

    if (msg.challenge) {
        const verified = crypto.verify(orgId, msg.challenge, orgRec.key_public);  // Verify challenge
        if (verified) {
            orgRec.state = "verified";
            adminOrg.update({ uid: orgId, rec: orgRec }, true);  // Update organization record as verified
        } else {
            orgRec.state = "failed";
            log({ org_failed_key_challenge: orgId });
        }
    }

    // Handle log synchronization messages
    if (msg.sync_log && orgRec.state === "verified") {
        const orgLog = logs.sub(orgId);
        orgLog.put(msg.sync_log, msg.value);
        sync.last = msg.sync_log;
        sync.count++;
        clearTimeout(sync.timer);
        sync.timer = setTimeout(() => {
            if (sync.count >= 10) {
                log({ org: orgId, log_sync: sync.count });
            }
            send({ log_checkpoint: sync.last, count: sync.count });  // Send log checkpoint
            sync.count = 0;
            sync.timer = undefined;
        }, 1000);
    }

    // Handle socket conflicts and store connected sockets
    if (connected[orgId] && connected[orgId] !== socket) {
        log({ socket_conflict: orgId });
    }

    connected[orgId] = socket;
    sockStat.org_id = orgId;
    sockStat.org_rec = orgRec;

    // State machine to handle different organization states
    switch (orgRec.state) {
        case "pending":
            log({ pending: orgRec });
            send({ hub_key_public: state.hub_keys.public });
            orgRec.state = "upgrading.1";
            break;
        case "upgrading.1":
            log({ upgrading: orgRec });
            send({ challenge: crypto.sign("morfius", state.hub_keys.private) });
            orgRec.state = "upgrading.2";
            break;
        case "upgrading.2":
            break;
        case "verified":
            if (!sockStat.verified) {
                if (context.debug) {
                    log({ org_connected: orgRec.name });
                }
                send({ welcome: "morfius", secret: orgRec.secret });
            }
            sockStat.verified = true;
            break;
        case "failed":
            break;
    }
}

/**
 * Periodically check and clean up stale connections
 */
setInterval(() => {
    for (const [orgId, socket] of Object.entries(connected)) {
        const { stat } = socket;
        const { org_rec } = stat;
        if (stat.ping && Date.now() - stat.ping > 6000) {  // Check if the last ping was more than 6 seconds ago
            if (context.debug) {
                log({ org_disconnect: org_rec ? org_rec.name : orgId });
            }
            delete connected[orgId];  // Remove stale connection
            socket.close();  // Close the socket
        }
    }
}, 2000);

/**
 * Check if an organization is connected
 * @param {string} orgId - The organization ID
 * @returns {boolean} - True if connected, false otherwise
 */
exports.is_connected = (orgId) => {
    return !!connected[orgId];
};

exports.setup = setup;