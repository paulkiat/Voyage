/**
 * Main hub for VoyageAI that services customer/organizations
 * Acts as the master for all organizational meta-data
 * Collects log and usage data from organizations
 */

const { args } = require('../lib/util');
const log = require('../lib/util').logpre('hub');
const web = require('../lib/web');
const api = require('./org-api');
const net = require('../lib/net');
const store = require('../lib/store');
const crypto = require('../lib/crypto');
const express = require('express');
const app_handler = express();
const web_handler = express();
const cli_server = require('../cli/store');
const cli_store = args["cli-store"];
const { debug } = args;

const state = {};
Object.assign(state, {
    app_port: args['app-port'] || (args.prod ? 80 : 8000),
    web_port: args['web-port'] || (args.prod ? 443 : 8443),
    app_handler,
    web_handler,
    org_api: api,
    org_link: require('./org-link.js'),
    wss_handler: ws_handler,
    ws_handler: ws_handler,
    debug
});

/**
 * INITIALIZATION
 * 
 * 1. Open meta-data data-store
 * 2. Open log-data data-store
 * 3. Detect first-time setup, create pub/priv key pair
 * 4. Start HTTP / HTTPS listening endpoints
 */

// WebSocket message handler
function ws_handler(ws, req) {
    // TODO: Add authentication here
    if (req.url === "/") {
        state.org_link.setup(state, ws);
    } else if (req.url === "/admin.api") {
        api.on_ws_connect(ws);
        ws.on('message', msg => api.on_ws_msg(ws, msg));
        ws.on('error', error => log({ ws_error: error }));
    } else {
        log({ invalid_ws_url: req.url, host: req.headers.host });
        ws.close();
    }
}

// Initialize meta-data store
async function setup_data_store() {
    log({ initialize: 'data store' });
    state.meta = await store.open("data/hub/meta");
}

// Initialize log-data store
async function setup_log_store() {
    log({ initialize: 'log store' });
    state.logs = await store.open("data/hub/logs");
}

// Initialize organization admin
async function setup_org_adm() {
    api.init(state);
}

// Generate and setup public/private key pair
async function setup_keys() {
    const { meta, logs } = state;
    state.hub_keys = await meta.get("hub-keys");
    if (!state.hub_keys) {
        log({ generating: "public/private key pair" });
        state.hub_keys = await crypto.createKeyPair();
        await meta.put("hub-keys", state.hub_keys);
    }
}

// Setup web handlers
function setup_web_handlers() {
    const serveStatic = require('serve-static')('web/hub', { index: ["index.html"] });
    // Localhost only admin interface
    app_handler
        .use(web.parse_query)
        .use(store.web_admin(state, 'meta'))
        .use(store.web_admin(state, 'logs'))
        .use(api.web_handler)
        .use(serveStatic)
        .use(web.four_oh_four);
    // Production HTTPS web interface
    web_handler
        .use(serveStatic)
        .use(web.four_oh_four);
}

(async () => {
    log({ voyage_hub_addr: net.host_addrs() });
    await setup_data_store();
    await setup_log_store();
    await setup_keys();
    await setup_org_adm();
    await setup_web_handlers();
    await web.start_web_listeners(state);
    // For seeding a default organization at the time of hub start
    if (args["default-org"]) {
        state.org_api.commands.create({
            name: args["org-id"] || "test",
            org_id: args["org-id"] || "test",
            creator: "system",
        }).catch(error => {
            // Ignore duplicate organization name error
            // console.log({ org_create_error: error });
        });
    }
    // For storage / meta / logging debugging
    if (cli_store) {
        cli_server.server(state.meta, 0, log);
        cli_server.server(state.logs, 0, log);
    }
})();