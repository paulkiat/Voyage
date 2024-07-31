import { $, $class, annotate_copyable } from './lib/utils.js';
import { on_key, uid, flash, show, hide, LS } from './lib/utils.js';
import { ws_proxy_api } from "./lib/ws-net.js";
import { users_header, users_line, apps_header, apps_line } from "./html.js";
import WsCall from './lib/ws-call.js';
import modal from './lib/modal.js';

const ws_api = new WsCall("admin.api");
const report = (o) => ws_api.report(o);
const call = (c, a) => ws_api.call(c, a);
const context = {
    direct: {},
    login: true,
};

function set_user_mode(mode) {
    switch (mode) {
        case "admin":
            show($class('admin-mode'));
            break;
        case "user":
            hide($class('admin-mode'));
            break;
        default:
            console.log({ invalid_user_mode: mode });
            break;
    }
}

function set_edit_mode(mode) {
    switch (mode) {
        case "app":
            show($class('edit-app'));
            hide($class('edit-user'));
            $('set-edit-app').classList.add("selected");
            $('set-edit-user').classList.remove("selected");
            break;
        case "user":
            show($class('edit-user'));
            hide($class('edit-app'));
            $('set-edit-app').classList.remove("selected");
            $('set-edit-user').classList.add("selected");
            user_list();
            break;
        default:
            console.log({ invalid_edit_mode: mode });
            break;
    }
}

function user_list() {
    context.api.pcall("user_list", {}).then(list => {
        const html = [];
        users_header(html);
        const users = context.users = {};
        for (let { name, is_admin } of list) {
            users_line(html, { name, is_admin });
            users[name] = name;
            user_list_set(html);
        }
        annotate_copyable();
    }).catch(report);
}

function user_list_set(html) {
    $('user-list').innerHTML = html.join('');
}

function user_create() {
    const rec = {
        user: $('user-name').value,
        pass: Math.round(Math.random() & 0xffffffff).toString(36)
    };
    if (!rec.user) {
        alert('missing user name');
    } else {
        context.api.pcall("user_add", rec).then(reply => {
            console.log({ user_create_said: reply });
            user_list();
        }).catch(report);
    }
}

function user_delete(user) {
    if (!user) {
        return alert('missing user name');
    }
    if (confirm(`Are you sure you want to delete "${user}"?`)) {
        context.api.pcall("user_del", { user }).then(reply => {
            console.log({ user_delete_said: reply });
            user_list();
        }).catch(report);
    }
}

function user_reset(user) {
    if (!user) {
        return alert('missing user name');
    }
    const pass = prompt(`Set a new password for "${user}"`, uid());
    if (pass) {
        context.api.pcall("user_reset", { user, pass }).then(reply => {
            console.log({ user_reset_said: reply });
            user_list();
        }).catch(report);
    }
}

function app_list() {
    call("app_list", { user: context.iam, admin: context.admin }).then(list => {
        const html = [];
        apps_header(html);
        const apps = context.apps = {};
        for (let app of list) {
            const { uid, created, direct } = app;
            const date = new Date(created).toLocaleString();
            apps_line(html, { date, ...app, admin: context.admin, iam: context.iam });
            apps[uid] = app;
            app_list_set(html);
            context.direct[uid] = direct;
        }
        annotate_copyable();
    }).catch(report);
}

function app_list_set(html = []) {
    $('app-list').innerHTML = html.join('');
}

function app_create() {
    const rec = {
        type: $('app-type').value,
        name: $('app-name').value,
        creator: context.iam || 'nobody'
    };
    if (!rec.name) {
        alert('missing app name');
    } else {
        call("app_create", rec).then(reply => {
            console.log({ app_create_said: reply });
            app_list();
        }).catch(report);
    }
}

function app_edit(uid) {
    const rec = context.apps[uid];
    if (!rec) throw `invalid app uid: ${uid}`;
    const edit = {
        name: $('edit-name'),
        users: $('edit-users'),
        admins: $('edit-admins')
    };
    modal.show('app-edit', 'edit app record', {
        update (b) {
            app_update(rec.uid, {
                name: edit.name.value,
                users: edit.users.value.split('\n').map(n => n.trim()),
                admins: edit.admins.value.split('\n').map(n => n.trim()),
            });
        },
        cancel: undefined
    });
    edit.name.value = rec.name;
    edit.users.value = (rec.users || []).join("\n");
    edit.admins.value = (rec.admins || []).join("\n");
}

function app_delete(uid, name) {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
        call("app_delete", { uid, name }).then(app_list).catch(report);
    }
}

function app_update(uid, rec) {
    call("app_update", { uid, rec }).then(app_list).catch(report);
}

function app_launch(uid) {
    const direct = context.direct[uid];
    if (direct) {
        const { host, port } = direct;
        window.open(`http://${host}:${port}/app/${uid}#${context.ssn}`, uid);
    } else {
        window.open(`/app/${uid}`, uid);
    }
}

function set_iam(iam, indicate = true) {
    LS.set('iam', context.iam = $('iam').value = iam);
    if (indicate) {
        flash($('iam'));
    }
}

function login_submit() {
    if (!modal.showing) {
        console.log({ cannot_login: "modal not showing" });
        return;
    }
    const user = $('username').value;
    const pass = $('password').value;
    if (!(user && pass)) {
        console.log({ cannot_login: "missing user and/or pass" });
        return;
    }
    set_iam(user, false);
    if (context.admin_init) {
        ssn_heartbeat(user, pass, $('password2').value, $('secret').value);
    } else {
        ssn_heartbeat(user, pass);
    }
}

function login_show(error, init) {
    if (!context.admin_init) {
        hide("login-init");
    }
    context.login = true;
    const show = error ? [ "login", "login-error" ] : [ "login" ];
    modal.show(show, "login", { login: login_submit }, { cancellable: false });
    $("username").value = context.iam || LS.get("iam") || "";
    if ($("username").value) {
        $('password').focus();
    } else {
        $('username').focus();
    }
    if (init) {
        $("secret").value = "";
    } else {
        $("password").value = "";
    }
    $("login-error").innerText = error || "...";
}

async function logout() {
    const { api, ssn } = context;
    set_user_mode('user');
    set_edit_mode('app');
    app_list_set();
    LS.delete("session");
    delete context.ssn;
    delete context.app_list;
    api.call("ssn_logout", { ssn }, ssn_heartbeat);
}

/**
 * Send a heartbeat to the server to maintain the session.
 * If a session cookie is present, send it along with the request.
 * If user credentials are provided, attempt to authenticate.
 * If an admin secret is provided, attempt to initialize the admin session.
 * Update the context state and show/hide the login modal as needed.
 * @param {string} user - username
 * @param {string} pass - password
 * @param {string} pass2 - optional confirmation password
 * @param {string} secret - admin secret
 */
function ssn_heartbeat(user, pass, pass2, secret) {
    // Clear the setTimeout timer for the next heartbeat
    clearTimeout(context.ssn_hb);

    // Retrieve the session cookie from local storage
    const ssn = LS.get("session");

    // If a session cookie is present, send it along with the request
    // If user credentials are provided, attempt to authenticate
    if (ssn || (user && pass)) {
        // Send a request to the server to authenticate the user
        context.api.pcall("user_auth", { ssn, user, pass, pass2, secret })
            .then((msg, error) => {
                // Destructure the response message
                const { sid, admin_init, user, org_admin } = msg;

                // If the server responded with an admin initialization request
                if (admin_init) {
                    // Hide the login error message and show the login initialization form
                    $("login-error").classList.add("hidden");
                    if (context.admin_init) {
                        // Log the failed admin initialization attempt
                        console.log({ failed_admin_init: user });
                        // Show the login modal with an error message
                        login_show("invalid secret", true);
                    } else {
                        show("login-init");
                    }
                    // Set the admin initialization flag in the context state
                    context.admin_init = true;
                } else {
                    // If the server responded with a valid session
                    delete context.admin_init; // Clear the admin initialization flag
                    context.org_admin = org_admin; // Update the organization admin flag
                    context.ssn_hb = setTimeout(ssn_heartbeat, 5000); // Set a timer for the next heartbeat
                    if (sid) { // If a valid session cookie was returned
                        context.ssn = sid; // Update the session cookie in the context state
                        LS.set("session", sid); // Store the session cookie in local storage
                        // Set the session cookie in the browser
                        document.cookie = 'rawh-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                        document.cookie = `rawh-session=${sid}`;
                        if (context.admin_init) { // If the admin initialization flag is set
                            modal.hide(true); // Hide the login modal
                        }
                    }
                    if (context.login) { // If this is the first successful login
                        console.log({ login: sid, user }); // Log the successful login
                        // If the user is an organization admin
                        if (org_admin) {
                            context.admin = true; // Update the admin flag in the context state
                            set_user_mode('admin'); // Set the user mode to admin
                            set_edit_mode('app'); // Set the edit mode to app
                        } else { // If the user is not an organization admin
                            context.admin = false; // Update the admin flag in the context state
                            set_user_mode('user'); // Set the user mode to user
                        }
                        if (user) { // If a username was provided
                            set_iam(user, false); // Set the IAM value in the context state and local storage
                        }
                        delete context.login; // Clear the login flag in the context state
                        modal.hide(true); // Hide the login modal
                        if (!context.app_list) { // If the app list has not been loaded
                            context.app_list = (context.app_list || 0) + 1; // Increment the app list load count
                            app_list(); // Load the app list
                        }
                    }
                }
            })
            .catch(error => { // If there was an error authenticating or initializing the admin session
                delete context.app_list; // Clear the app list load flag
                delete context.admin_init; // Clear the admin initialization flag
                LS.delete("session"); // Delete the session cookie from local storage
                login_show(error); // Show the login modal with the error message
                console.log({ auth_error: error }); // Log the authentication error
            });
    } else { // If neither a session cookie nor user credentials were provided
        login_show(); // Show the login modal
    }
}

window.appfn = {
    list: app_list,
    edit: app_edit,
    create: app_create,
    delete: app_delete,
    launch: app_launch,
};

window.userfn = {
    list: user_list,
    reset: user_reset,
    create: user_create,
    delete: user_delete,
};

document.addEventListener('DOMContentLoaded', async function() {
    context.api = (context.api || await ws_proxy_api());
    modal.init(context, "modal.html").then(() => {
        on_key('Enter', 'password', login_submit);
        show('org', 'flex');
        ssn_heartbeat();
    });
    $('logout').onclick = logout;
    $('create-app').onclick = app_create;
    $('create-user').onclick = user_create;
    $('set-edit-app').onclick = () => set_edit_mode('app');
    $('set-edit-user').onclick = () => set_edit_mode('user');
    on_key('Enter', 'app-name', ev => {
        app_create();
        $('app-name').value = '';
    });
    on_key('Enter', 'user-name', ev => {
        user_create();
        $('user-name').value = '';
    });
    set_user_mode('user');
    set_edit_mode('app');
});