// Manages organization functions for the AI Travel Companion application

import { $, annotate_copyable, on_key, loadHighlightingCSS } from './lib/utils.js';
import WsCall from './lib/ws-call.js';
import modal from './lib/modal.js';

const dayms = 1000 * 60 * 60 * 24; // milliseconds in a day
const ws_api = new WsCall("admin.api"); // WebSocket call instance for admin API
const report = (o) => ws_api.report(o); // function to report errors
const call = (c, a) => ws_api.call(c, a); // function to make API calls
const context = {};

loadHighlightingCSS(); // Load CSS for syntax highlighting

function org_list() {
    // 0. Calls the call function with the command "org_list" and an empty object.
    call("org_list", {}).then(list => {
        const html = [
            '<div class="head">',
            '<label>name</label>',
            '<label>uid</label>',
            '<label>secret</label>',
            '<label>status</label>',
            '<label>creator</label>',
            '<label>created</label>',
            '<label>actions</label>',
            '</div>',
        ];
        // 1. Processes the returned list of organizations.
        const orgs = context.orgs = {};
        for (let org of list) {
            // 2. Constructs HTML to display organization details.
            const { uid, name, secret, creator, created, state, up } = org;
            // 3. Updates the context.orgs object with the organization data.
            const date = dayjs(created).format('YYYY/MM/DD HH:mm');
            // 4. Updates the inner HTML of the element with ID org-list.
            html.push([
                `<div class="data${up ? " connected" : ""}">`,
                `<label class="copyable">${name}</label>`,
                `<label class="copyable">${uid}</label>`,
                `<label class="copyable">${secret}</label>`,
                `<label>${state}</label>`,
                `<label>${creator}</label>`,
                `<label>${date}</label>`,
                `<label class="actions">`,
                `<button onclick="orgfn.logs('${uid}')">...</button>`,
                `<button onclick="orgfn.edit('${uid}')">?</button>`,
                `<button onclick="orgfn.delete('${uid}','${name}')">X</button>`,
                `</label>`,
                '</div>',
            ].join(''));
            orgs[uid] = org;
        }
        $('org-list').innerHTML = html.join('');
        annotate_copyable(); // Make certain elements copyable
    }).catch(report);
}

/**
 * Opens the modal for editing an organization.
 * @param {string} uid - Unique ID of the organization.
 */
function org_edit(uid) {
    const rec = context.orgs[uid];
    if (!rec) throw `invalid org uid: ${uid}`;
    const edit = {
        name: $('edit-name'),
    };
    modal.show('org-edit', "edit org record", {
        update(b) {
            org_update(rec.uid, {
                name: edit.name.value,
            });
        },
        cancel: undefined,
    });
    edit.name.value = rec.name;
}

/**
 * Opens the modal to display logs for an organization.
 * @param {string} uid - Unique ID of the organization.
 */
function org_logs(uid) {
    const rec = context.orgs[uid];
    if (!rec) throw `invalid org uid: ${uid}`;
    const range = {};
    const buttons = {};
    const nb = modal.show('org-logs', "org logs", {
        '<<': () => {
            const from = parseInt(range.from, 36) - dayms;
            range.update(from.toString(36), (from + dayms).toString(36));
            return false;
        },
        '>>': () => {
            const from = parseInt(range.from, 36) + dayms;
            range.update(range.from.toString(36), (from + dayms).toString(36));
            return false;
        },
        close: undefined,
    });
    Object.assign(buttons, nb);
    range.update = (start, end) => call("org_logs", { org_id: uid, start, end }).then(logs => {
        if (!(logs && logs.length)) {
            return;
        }
        const first = range.from = logs[0][0];
        const last = range.to = logs[logs.length - 1][0];
        const output = $('show-logs');
        if (!range.min || first < range.min) range.min = first;
        if (!range.max || last > range.max) range.max = last;
        buttons['>>'].disabled = range.to >= range.max;
        output.innerHTML = logs.map(row => {
            return [
                '<div>',
                '<label>',
                dayjs(parseInt(row[0], 36)).format('YYYY/MM/DD HH:mm:ss'),
                '</label>',
                hljs.highlight(JSON.stringify(row[1]), { language: "json" }).value,
                '</div>',
            ].join(" ");
        }).join("\n");
        output.scrollTop = output.scrollHeight;
    });
    range.update();
}

/**
 * Deletes an organization after user confirmation.
 * @param {string} uid - Unique ID of the organization.
 * @param {string} name - Name of the organization.
 */
function org_delete(uid, name) {
    confirm(`Are you sure you want to delete "${name}"?`) &&
        call("org_delete", { uid }).then(org_list).catch(report);
}

/**
 * Creates a new organization.
 */
function org_create() {
    const name = $('org-name').value;
    if (!name) {
        alert('missing org name');
    } else {
        call("org_create", { name, creator: "unknown" }).then(org_list).catch(report);
    }
}

/**
 * Updates an organization's record.
 * @param {string} uid - Unique ID of the organization.
 * @param {Object} rec - Updated record data.
 */
function org_update(uid, rec) {
    call("org_update", { uid, rec }).then(org_list).catch(report);
}

// Define global functions for organizational actions
window.orgfn = {
    list: org_list,
    edit: org_edit,
    logs: org_logs,
    create: org_create,
    delete: org_delete,
};

// Initialize event listeners once the DOM content is loaded
document.addEventListener('DOMContentLoaded', function () {
    modal.init(context, "modal.html");
    ws_api.on_connect(org_list);
    $('create-org').onclick = org_create;
    on_key('Enter', 'org-name', (ev) => {
        org_create();
        $('org-name').value = '';
    });
});