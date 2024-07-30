const util = require("../lib/util");
const log = util.logpre("auth");
const crypto = require("crypto");
const express = require("express");
const api_app = require("./api-app");
const { REDIRECT_URI } = require("../lib/auth-config");
const msal = require("@azure/msal-node");

const context = {};
let active_sessions = {};


// Initializes the authentication services.
// Sets up the meta and node handlers.
exports.init = function (state) {
    const { meta, node } = state;
    log({ initialize: "auth services" });
    context.state = state;
    context.meta_ssn = meta.sub("ssn");
    context.meta_user = meta.sub("user");
    node.handle("user_add", user_add);
    node.handle("user_del", user_del);
    node.handle("user_get", user_get);
    node.handle("user_set", user_set);
    node.handle("user_list", user_list);
    node.handle("user_auth", user_auth);
    node.handle("user_sso", user_sso);
    node.handle("auth_sso", auth_sso);
    node.handle("active_user_session", active_user_session);
    node.handle("service_check", service_check);
    node.handle("user_reset", user_reset);
    node.handle("ssn_logout", ssn_logout);
    node.handle("toggle_org_admin", toggle_org_admin);
};


// Returns true if the session is valid and the user is permitted access to an app_id.
// If the app_id is omitted, it returns true if the session is valid.
exports.is_session_valid = async function (ssn_id, app_id) {
    if (Array.isArray(ssn_id)) {
        for (let sid of ssn_id) {
            if (await exports.is_session_valid(sid, app_id)) {
                return true;
            }
        }
        return false;
    }
    const ssn = await context.meta_ssn.get(ssn_id);
    if (!ssn) {
        return false;
    }
    if (!ssn.org_admin && app_id) {
        return await api_app.has_app_perms(app_id, ssn.user);
    }
    return true;
};

/**
 * Culls dead sessions periodically.
 * Deletes sessions that have expired.
 */
async function cull_dead_sessions() {
    const { meta_ssn } = context;
    const now = Date.now();
    const batch = await meta_ssn.batch();
    let sessions = [];
    for await (const [key, rec] of meta_ssn.iter()) {
        sessions.push(rec);
        if (rec.expires < now) {
            batch.del(key);
        }
    }
    active_sessions['active'] = sessions;
    await batch.write();
}

setInterval(cull_dead_sessions, 5000);

/**
 * Hashes a string using SHA-256.
 */
function hash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Returns active user sessions.
 */
async function active_user_session() {
    return active_sessions;
}

/**
 * Service check endpoint for the proxy.
 */
async function service_check() {
    return { service: 'proxy', status: 'ok' };
}

/**
 * Adds a new user.
 */
async function user_add(args) {
    const { meta_user } = context;
    const { user, pass } = args;
    const user_names = (await user_list())?.map(rec => rec.name) || [];
    if (user_names.indexOf(user) >= 0) {
        throw "username already exists";
    }
    return await meta_user.put(user, {
        created: Date.now(),
        password: hash(pass || ''),
    });
}

/**
 * Toggles organization admin status for a user.
 */
async function toggle_org_admin(args) {
    const { user, admin } = args;
    const user_names = (await user_list())?.map(rec => rec.name) || [];
    if (user_names.indexOf(user) < 0) {
        throw "username doesn't exist";
    }

    const result = await api_app.toggle_org_admin(user, admin);
    const curr_user = await user_get({ user });

    await user_set({
        user,
        rec: {
            ...curr_user,
            updated: Date.now(),
        }
    });

    return result;
}

/**
 * Lists all users.
 */
async function user_list() {
    const { meta_user } = context;
    const list = (await meta_user.keys()).map(name => { return { name } });
    for (let rec of list) {
        rec.is_admin = await api_app.is_org_admin(rec.name);
    }
    return list;
}

/**
 * Deletes a user.
 */
async function user_del(args) {
    const { meta_user } = context;
    return await meta_user.del(args.user);
}

/**
 * Gets user details.
 */
async function user_get(args) {
    const { meta_user } = context;
    return await meta_user.get(args.user);
}

/**
 * Sets user details.
 */
async function user_set(args) {
    const { meta_user } = context;
    const { user, rec } = args;
    const orec = await user_get({ user });
    const nurec = Object.assign(orec, rec);
    return await meta_user.put(user, nurec);
}

/**
 * Resets user password.
 */
async function user_reset(args) {
    const { user, pass } = args;
    const rec = await user_get(args);
    if (rec) {
        await user_set({
            user,
            rec: {
                ...rec,
                updated: Date.now(),
                password: hash(pass || '')
            }
        });
    }
}

/**
 * Logs out a session.
 */
async function ssn_logout(args) {
    const { meta_ssn } = context;
    const { ssn } = args;
    ssn && await meta_ssn.del(ssn);
    return { ssn };
}

/**
 * Authenticates a user.
 */
async function user_auth(args) {
    if (args.user) {
        args.user = args.user.toLowerCase();
    }
    const { state, meta_user, meta_ssn } = context;
    const { ssn, user, pass, pass2, secret } = args;
    if (ssn) {
        const rec = await meta_ssn.get(ssn);
        if (rec) {
            rec.expires = Date.now() + 60000;
            await meta_ssn.put(ssn, rec);
            return rec;
        } else {
            throw "invalid session";
        }
    } else if (user && pass) {
        let urec = await meta_user.get(user);
        let org_admin = false;
        if (!urec) {
            const is_admin = org_admin = await api_app.is_org_admin(user);
            log({ norec: user, is_admin });
            if (is_admin && pass === pass2 && secret === state.secret) {
                log({ creating_admin_record: user, pass, pass2, secret });
                await user_add({ user, pass });
                urec = await user_get({ user });
            } else {
                return is_admin ? { admin_init: true } : error("invalid credentials");
            }
        } else {
            org_admin = await api_app.is_org_admin(user);
        }
        if (urec.password !== hash(pass)) {
            throw "invalid password";
        }
        const sid = util.uid();
        const srec = {
            sid,
            user,
            org_admin,
            expires: Date.now() + 60000
        };
        meta_ssn.put(sid, srec);
        return srec;
    } else {
        throw "missing session and credentials";
    }
}

/**
 * Generates Single Sign-On (SSO) URL.
 */
async function user_sso(args) {
    const { state } = context;
    const redirect_uri = args.redirect_uri;
    const msalConfig = state.msalConfig;
    const client = new msal.ConfidentialClientApplication(msalConfig);
    return await client.getAuthCodeUrl({
        scopes: ["User.ReadBasic.All"],
        redirectUri: redirect_uri || REDIRECT_URI,
    });
}

/**
 * Authenticates a user via SSO.
 */
async function auth_sso(args) {
    const { state, meta_user, meta_ssn } = context;
    const redirect_uri = args.redirect_uri;
    const msalConfig = state.msalConfig;
    const client = new msal.ConfidentialClientApplication(msalConfig);
    const response = await client.acquireTokenByCode({
        code: args.code,
        scopes: ["User.ReadBasic.All"],
        redirectUri: redirect_uri || REDIRECT_URI,
    });
    const user = response.account.username;
    let urec = await meta_user.get(user);
    let org_admin = false;
    if (!urec) {
        const is_admin = org_admin = await api_app.is_org_admin(user);
        log({ norec: user, is_admin });
        log({ creating_admin_record: user });
        await user_add({ user });
        urec = await user_get({ user });
    } else {
        org_admin = await api_app.is_org_admin(user);
    }
    const sid = util.uid();
    const srec = {
        sid,
        user,
        org_admin,
        expires: Date.now() + 60000
    };
    meta_ssn.put(sid, srec);
    return srec;
}