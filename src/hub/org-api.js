/**
 * Server-side simple curl-able REST admin API
 * This module provides various administrative commands to manage organizations.
 */

const router = require('express').Router();
const util = require('../lib/util');  // Import utility functions
const log = util.logpre('adm');       // Preconfigured logger
const { uuid, json, parse } = util;   // JSON utility functions
const context = {};                   // Context state

/**
 * Initialize the context state with the provided state object
 * @param {Object} state - The initial state
 */
exports.init = function (state) {
    Object.assign(context, state);
    context.orgs = state.meta.sub('org');  // Initialize organization sub-level
};

/**
 * Send a JSON message through the WebSocket connection
 * @param {Object} msg - The message to send
 */
function send(msg) {
    context.ws.send(json(msg));
}

/**
 * WebSocket connection handler
 * @param {WebSocket} ws - The WebSocket instance
 */
exports.on_ws_connect = function (ws) {
    context.ws = ws;
};

/**
 * Handle incoming WebSocket messages
 * @param {WebSocket} ws - The WebSocket instance
 * @param {Object} msg - The incoming message
 */
exports.on_ws_msg = async function (ws, msg) {
    msg = parse(msg.toString());
    const { cmd, cid, args } = msg;
    const cmd_fn = commands[cmd];  // Get the command function
    if (cmd_fn) {
        if (cid) {
            cmd_fn(args)
                .then(reply => send({ cid, args: reply }))
                .catch(error => {
                    log({ cid, args, error });
                    send({ cid, error: error.toString() });
                });
        } else {
            cmd_fn(args);
        }
    } else {
        return send({ cid, error: `no matching command: ${cmd}` });
    }
};

const commands = {
    org_list,
    org_logs,
    org_create,
    org_update,
    org_delete,
    org_by_uid,
    org_by_name
};

/**
 * Execute a shell command asynchronously
 * @param {string} command - The command to execute
 */
async function executeCmd(command) {
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}

/**
 * Create a new organization
 * @param {Object} args - The arguments for creating an organization
 * @returns {string} - The unique identifier of the created organization
 */
async function org_create(args) {
    const { name, creator, org_id } = args;
    const uid = org_id || util.uid().toUpperCase();
    const exists = await org_by_name({ name });
    // Prevent creating two orgs with the same name
    if (exists) {
        throw "duplicate org name";
    }

    // Create organization record stub, assign new uid and return it
    await context.orgs.put(uid, {
        name: name || "unknown",
        secret: uuid(),
        creator: creator || "unknown",
        created: Date.now(),
        state: 'pending',
        saas: true, // True if Raw hosts
    });

    return uid;
}

/**
 * List all organizations
 * @returns {Array} - List of organizations
 */
async function org_list() {
    const { orgs, org_link } = context;
    return (await orgs.list()).map(row => {
        return {
            uid: row[0],
            ...row[1],
            up: org_link.is_connected(row[0])
        };
    });
}

/**
 * Get logs for a specific organization
 * @param {Object} args - The arguments containing organization ID and date range
 * @returns {Array} - List of logs
 */
async function org_logs(args) {
    const { logs } = context;
    const { org_id } = args;
    const org_log = logs.sub(org_id);
    const dayms = 1000 * 60 * 60 * 24;
    const start = args.start || (Date.now() - dayms).toString(36);
    const end = args.end || Date.now().toString(36);
    return await org_log.list({ gte: start, lte: end });
}

/**
 * Update an organization record
 * @param {Object} args - The arguments containing organization UID and updated record
 * @param {boolean} trusted - Whether the update is trusted
 */
async function org_update(args, trusted) {
    const { orgs, org_link } = context;
    const { uid, rec } = args;
    // Limits updates to a subset of fields
    const old = await orgs.get(uid);
    if (old) {
        Object.assign(old, {
            name: rec.name ?? old.name,
        });
        if (trusted) {
            Object.assign(old, {
                state: rec.state
            });
        }
        await context.orgs.put(uid, old);
    }
}

/**
 * Delete an organization record
 * @param {Object} args - The arguments containing organization UID
 * @returns {Promise} - Promise resolving the deletion
 */
async function org_delete(args) {
    return await context.orgs.del(args.uid);
}

/**
 * Get an organization by UID
 * @param {Object} args - The arguments containing organization UID
 * @returns {Object} - The organization record
 */
async function org_by_uid(args) {
    return await context.orgs.get(args.uid);
}

/**
 * Get an organization by name
 * @param {Object} args - The arguments containing organization name
 * @returns {Array} - The organization record and UID
 */
async function org_by_name(args) {
    const list = await context.orgs.list({ limit: Infinity });
    for (let [uid, rec] of list) {
        if (rec.name === args.name) {
            return [uid, rec];
        }
    }
    return undefined;
}

exports.web_handler = router;  // Export router as web handler
exports.commands = {
    list: org_list,
    logs: org_logs,
    create: org_create,
    update: org_update,
    delete: org_delete,
    by_uid: org_by_uid,
    by_name: org_by_name
};