

const crypto = require('../lib/crypto');
const util = require('../lib/util');
const log = util.logpre('link');
const { json, parse } = util;
const WebSocket = require('ws');

// Connection states
const link_states = {
    offline: 0,
    starting: 1,
    opened: 2,
    authenticated: 3
};

// Link object to manage connection state and functions
const link = {
    state: link_states.offline,
    send: undefined,
    end: undefined
};

// Error tracking for the connection
const link_err = {
    msg: undefined,
    count: 0,
    repeat: 10
};

let heartbeat_timer;

/**
 * Maintains a persistent connection to the Rawh hub
 * Allows synchronization of org and application metadata
 * Provides a channel to push usage and event logging to Rawh
 */
async function start_hub_connection(state) {
    if (link.state !== link_states.offline) {
        log({ exit_on_invalid_state: link.state });
        return;
    }

    state.link = link;
    link.state = link_states.starting;
    const ws = new WebSocket(`wss://${state.hub_host}:${state.hub_port}`, {
        rejectUnauthorized: false // allow self-signed certificates
    });

    ws.on('open', function open() {
        link.state = link_states.opened;
        // Heartbeat ping every 2.5 seconds to detect link errors and reset
        heartbeat_timer = setInterval(() => {
            link.send({ ping: Date.now() });
            sync_logs(state);
        }, 2500);
        // Define send function and send a welcome message (org-id)
        link.send = (msg) => ws.send(json(msg));
        link.send({ org_id: state.org_id });
        // Reset error state on successful connection
        link_err.msg = undefined;
        link_err.count = 1;
        link_err.repeat = 10;
    });

    ws.on('message', function (data) {
        handle(state, parse(data.toString()));
    });

    ws.on('close', () => {
        link.state = link_states.offline;
        link.send = (msg) => {
            // should we perma-log this?
            log('hub link down. message dropped');
        };
        clearTimeout(heartbeat_timer);
        // Retry connection to hub on a downed link
        setTimeout(() => { start_hub_connection(state) }, 5000);
    });

    ws.on('error', (error) => {
        const msg = json(error);
        if (msg === link_err.msg) {
            if ((++link_err.count) % link_err.repeat === 0) {
                link_err.repeat = Math.min(50, link_err.repeat + 10);
            } else {
                return;
            }
        } else {
            link_err.count = 1;
            link_err.repeat = 10;
        }
        link_err.msg = msg;
        const errobj = { link_err: Object.assign({}, error) };
        if (link_err.count > 1) {
            errobj.repeated = link_err.count;
        }
        log(errobj);
    });
}

async function sync_logs(state) {
    if (link.state !== link_states.authenticated) {
        return;
    }
    const { meta, logs } = state;
    const lastcp = await meta.get("org-log-checkpoint") || '';
    let syncd = 0;
    for await (const [key, value] of logs.iter({ gt: lastcp })) {
        link.send({ sync_log: key, value });
        syncd++;
    }
}

async function handle(state, msg) {
    const { meta } = state;

    if (msg.hub_key_public) {
        state.hub_key_public = msg.hub_key_public;
        await meta.put('hub-key-public', state.hub_key_public);
        link.send({ org_key_public: state.org_keys.public });
    }

    if (msg.challenge) {
        const ok = crypto.verify("Rawh", msg.challenge, state.hub_key_public);
        if (ok) {
            link.send({ challenge: crypto.sign(state.org_id, state.org_keys.private) });
        } else {
            log({ failed_hub_key_challenge: "Rawh" });
        }
    }

    if (msg.welcome) {
        link.state = link_states.authenticated;
        link.verbose_sync = true;
        log({ hub_connected: msg.welcome });
        await sync_logs(state);
    }

    if (msg.log_checkpoint) {
        meta.put("org-log-checkpoint", msg.log_checkpoint);
        if (link.verbose_sync) {
            log(msg);
        }
        link.verbose_sync = false;
    }

    if (msg.secret) {
        await meta.put('org-secret', state.secret = msg.secret);
    }
}

exports.start_hub_connection = start_hub_connection;