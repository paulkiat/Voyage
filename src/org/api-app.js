/**
 * WebSocket API handler (node/server) for AI Travel Companion (apps/users)
 */

const net = require('net');
const { args, env } = require("../lib/util");
const { exec } = require("child_process");
const log = require('../lib/util').logpre('api');
const router = require('express').Router();
const { json, parse, uuid, uid } = require('../lib/util');

const context = {
    alive: {},
    direct: {}
};

// Function to send message via WebSocket
function send(ws, msg) {
    ws.send(json(msg));
}

// Initialize API context
exports.init = function (state) {
    context.state = state;
    const { meta, logs, node } = context.state;
    context.meta_app = meta.sub("app");
};

// Handle WebSocket connection
exports.on_ws_connect = function (ws) {}

// Handle incoming WebSocket messages
exports.on_ws_msg = async function (ws, msg) {
    msg = parse(msg.toString());
    const { cmd, cid, args } = msg;
    const cmd_fn = commands[cmd];
    if (cmd_fn) {
        if (cid) {
            cmd_fn(args)
                .then(reply => send(ws, { cid, args: reply }))
                .catch(error => {
                    log({ cid, args, error });
                    send(ws, { cid, error: error.toString() });
                });
        } else {
            cmd_fn(args);
        }
    } else {
        return send(ws, { cid, error: `no matching command: ${cmd}` });
    }
}

// Command functions
const commands = {
    app_list,
    app_create,
    app_update,
    app_delete,
    app_get,
    service_check,
};

// Check service status
async function service_check(args) {
    return { service: 'admin', status: 'ok' };
}

// Create a new app
async function app_create(args) {
    const { meta_app } = context;
    const { type, name, creator, users, app_id } = args;
    const app_names = (await meta_app.vals()).map(r => r.name);
    if (app_names.indexOf(name) >= 0) {
        throw "app name already exists";
    }
    const app_uid = app_id || uid().toUpperCase();
    const app_rec = {
        uid: app_uid,
        type,
        name,
        creator: creator.toLowerCase() || "unknown",
        created: Date.now(),
        admins: [creator.toLowerCase()] || [],
        users: users || [],
    };
    await meta_app.put(app_rec.uid, app_rec);
    return app_rec;
}

// List all apps
async function app_list(args) {
    const { meta_app } = context;
    const { user, admin } = args;
    const apps = (await meta_app.list())
        .map(rec => rec[1])
        .filter(app => {
            app.alive = context.alive[app.uid];
            app.direct = context.direct[app.uid];
            return admin
                || (app.users && app.users.indexOf(user) >= 0)
                || (app.admins && app.admins.indexOf(user) >= 0)
        });
    console.log("apps ", apps);
    return apps;
}

// Get app details
async function app_get(args) {
    const { user, admin, uid } = args;
    const app = await context.meta_app.get(uid);
    if (app && (admin
        || (app.users && app.users.indexOf(user) >= 0)
        || (app.admins && app.admins.indexOf(user) >= 0))) {
        app.alive = context.alive[app.uid];
        app.direct = context.direct[app.uid];
        return app;
    }
    return app;
}

// Execute shell command
async function execute_app_cmd(cmd) {
    log("--------------   executing shell command   --------------")
    log(cmd)
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            log(`stderr: ${stderr}`);
            return;
        }
        log(`stdout: ${stdout}`);
    });
}

// Update app details
async function app_update(args) {
    const { uid, rec } = args;
    const apprec = await context.meta_app.get(uid);
    const { name, users, admins } = rec;
    if (apprec) {
        Object.assign(apprec, {
            name: name || apprec.name,
            users: users || apprec.users,
            admins: admins || apprec.admins
        });
        await context.meta_app.put(uid, apprec);
        return apprec;
    } else {
        throw `invalid update app name "${name}"`;
    }
}

// Delete an app
async function app_delete(args) {
    const { meta_app } = context;
    const { uid } = args;
    return await meta_app.del(uid);
}

// Register an app as alive
async function register_app(args) {
    const { meta_app } = context;
    const { app_id } = args;
    const apprec = await meta_app.get(app_id);
    if (apprec) {
        context.alive[app_id] = Date.now();
    }
    return apprec ? true : false;
}

// Check if user is org admin
async function is_org_admin(args) {
    const { meta } = context.state;
    return (await meta.get("org-admins")).indexOf(args.username) >= 0;
}

// Toggle org admin status for a user
async function toggle_org_admin(args) {
    const { meta } = context.state;
    const { username, admin } = args;
    let org_admins = await meta.get("org-admins");
    if (admin) {
        if (org_admins.indexOf(username) < 0) {
            org_admins.push(username);
        }
    } else {
        org_admins = org_admins.filter(un => un !== username);
    }
    await meta.put("org-admins", org_admins);
    return (await meta.get("org-admins")).indexOf(username) >= 0;
}

// Check if user has app permissions
async function has_app_perms(args) {
    const { app_id, user } = args;
    const apprec = await context.meta_app.get(app_id);
    const { users, admins } = apprec || {};
    return (users || []).indexOf(user) >= 0 || (admins || []).indexOf(user) >= 0;
}

// Set direct connection details for an app
function set_app_direct(args) {
    const { app_id, host, port } = args;
    log({ app_direct: app_id, host, port });
    context.direct[app_id] = { host, port };
}

// Set proxy connection for an app
function set_app_proxy(args) {
    const { app_id } = args;
    log({ app_proxy: app_id });
    delete context.direct[app_id];
}

exports.commands = commands;
exports.web_handler = router;
exports.register_app = (app_id) => register_app({ app_id });
exports.is_org_admin = (username) => is_org_admin({ username });
exports.toggle_org_admin = (username, admin) => toggle_org_admin({ username, admin });
exports.has_app_perms = (app_id, user) => has_app_perms({ app_id, user });
exports.set_app_direct = (app_id, host, port) => set_app_direct({ app_id, host, port });
exports.set_app_proxy = (app_id) => set_app_proxy({ app_id });