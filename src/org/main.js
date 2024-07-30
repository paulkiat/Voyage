/** Main organizational server / broker / metadata server */

const { args, env } = require("../lib/util");
const { proxy } = require("../lib/net");
const { debug } = args;
const log = require("../lib/util").logpre("org");
const net = require("../lib/net");
const web = require("../lib/web");
const store = require("../lib/store");
const crypto = require("../lib/crypto");
const api_app = require("./api-app");
const web_proxy = require("./web-proxy");
const adm_handler = require("express")();
const app_handler = require("express")();
const web_handler = require("express")();
const cli_server = require("../cli/store");
const msalConfig = require("../lib/auth-config").msalConfig;
const cli_store = args["cli-store"];
const expressStaticGzip = require("express-static-gzip");

const state = {};
Object.assign(state, {
    org_id: env("ORG_ID") || args["org-id"],
    ssl_dir: env("SSL_DIR") || args["ssl-dir"], // for customer supplied SSL key & cert files
    hub_host: env("HUB_HOST") || args["hub-host"] || (args.prod ? "apps.rawh.ai" : "localhost"),
    app_dir: env("APP_DIR") || args["app-dir"] || "org",
    hub_port: env("HUB_PORT") || args["hub-port"] || (args.prod ? 443 : 8443),
    adm_port: args["adm-port"] || (args.prod ? 80 : 9001),
    app_port: args["app-port"] || (args.prod ? 81 : 9000),
    web_port: args["web-port"] || (args.prod ? 443 : 9443),
    proxy_port: env("PROXY_PORT") || args["proxy-port"] || 6000,
    adm_handler: adm_handler.use(web.parse_query).use(store.web_admin(state, "meta")).use(store.web_admin(state, "logs")),
    web_handler,
    app_handler: web_handler,
    wss_handler: ws_handler,
    ws_handler: ws_handler,
    debug,
    msalConfig: msalConfig,
});

/**
 * INITIALIZATION
 *
 * 1. Open metadata datastore
 * 2. Open log datastore
 * 3. Detect first-time setup, create pub/priv key pair
 * 4. Start proxy listener (aka broker)
 * 5. Start node services (app listeners, etc)
 * 6. Start connection to rawh hub
 */

function ws_handler(ws, req) {
    // TODO: Add a little auth here :)
    if (req.url === "/admin.api") {
        api_app.on_ws_connect(ws);
        ws.on("message", (msg) => api_app.on_ws_msg(ws, msg));
        ws.on("error", (error) => log({ ws_error: error }));
        ws.on("close", () => log({ ws_admin_close: true }));
    } else {
        log({ invalid_ws_url: req.url });
        ws.close();
    }
}

async function setup_data_store() {
    log({ initialize: "data store" });
    state.meta = await store.open(`data/org/${state.org_id}/meta`);
    if (!state.org_id) {
        log({ exit_on_missing_org_id: state.org_id });
        process.exit();
    }
    log({ org_id: state.org_id });
    await state.meta.put("org-id", state.org_id);
}

async function setup_log_store() {
    log({ initialize: "log store" });
    state.logs = await store.open(`data/org/${state.org_id}/logs`);
    state.logr = function () {
        state.logs.put(Date.now().toString(36), [...arguments]);
        if (debug) {
            log("logger", ...arguments);
        }
    };
}

async function setup_keys() {
    const { meta, logs } = state;
    state.org_keys = await meta.get("org-keys");
    if (!state.org_keys) {
        log({ generating: "public/private key pair" });
        state.org_keys = await crypto.createKeyPair();
        await meta.put("org-keys", state.org_keys);
    }
    state.hub_key_public = await meta.get("hub-key-public");
}

async function setup_org_admins() {
    // Ensure there is at least one org admin, if not, create default admin
    const org_admins = await state.meta.get("org-admins");
    if (!org_admins || org_admins.length === 0) {
        await state.meta.put("org-admins", ["admin"]);
    }
}

async function setup_web_handlers() {
    const static = require("serve-static")(`web/${state.app_dir}`, {
        index: ["index.html"],
    });
    // Localhost only admin API
    adm_handler
        .use(store.web_admin(state, "meta"))
        .use(store.web_admin(state, "logs"))
        .use(web.four_oh_four);
    // Localhost HTTP app test interface
    app_handler
        .use(web.parse_query)
        .use(api_app.web_handler)
        .use(web_proxy.web_handler)
        .use(static)
        .use(web.four_oh_four);
    // Production HTTPS app production interface
    web_handler
        .use(web.parse_query)
        .use(api_app.web_handler)
        .use(web_proxy.web_handler)
        .use(static)
        .use(web.four_oh_four);
}

async function setup_org_proxy() {
    log({ initialize: "service broker" });
    proxy(state.proxy_port);
}

async function setup_org_apis() {
    // Setup node connection to broker (proxy)
    const node = (state.node = net.node("localhost", state.proxy_port));
    node.subscribe("logger/*", (msg, cid, topic) => {
        state.logr(topic.split("/")[1], msg);
    });
    // Attach web (HTTPS/WSS) handlers
    web_proxy.init(state);
    api_app.init(state);
    // Inject WSS handlers prior to `web.start_web_listeners()`
    // This proxy to node is needed so that proxied apps have
    // access to the broker API endpoint
    const wss_handler = web.ws_proxy_path(state.node, undefined, ws_handler);
    Object.assign(state, {
        wss_handler,
        ws_handler: wss_handler,
    });
}

(async () => {
    await setup_data_store();
    await setup_log_store();
    await setup_keys();
    await setup_org_admins();
    await setup_org_proxy();
    await setup_org_apis();
    await setup_web_handlers();
    await web.start_web_listeners(state);
    await require("./hub-link").start_hub_connection(state);
    state.logr({ started: "org services" });
    // For seeding a test app
    if (args["test-app"]) {
        api_app.commands
            .app_create({
                name: "test",
                type: "test",
                app_id: args["app-id"] || "test",
                creator: "system",
                admins: ["admin"],
            })
            .catch((error) => {
                // Ignore duplicate app name error
                // console.log({ app_create_error: error });
            });
    }
    // For storage / meta / logging debugging
    if (cli_store) {
        cli_server.server(state.meta, 0, log);
        cli_server.server(state.logs, 0, log);
    }
})();