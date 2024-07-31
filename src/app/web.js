// AI Travel Companion Web Application Frontend Service

const { args, env } = require('../lib/util');
const log = require('../lib/util').logpre('app');
const web = require('../lib/web');
const state = require('./service.js').init();
const express = require('express');
const app_handler = express();
const ws_handler = web.ws_proxy_path(state.node);
const expressStaticGzip = require('express-static-gzip');

Object.assign(state, {
    direct: args['direct'] || false,
    app_dir: env('APP_DIR') || args['app-dir'] || 'app',
    app_port: env('APP_PORT') ?? args['app-port'] ?? (args.prod ? 80 : 7000),
    app_handler,
    ws_handler
});

/**
 * Setup Node
 * Re-announce the web app when the proxy connection bounces.
 */
async function setup_node() {
    state.node.on_reconnect(announce_service);
}

/**
 * Announce Service
 * Give the org web server an endpoint for proxying app web requests.
 */
async function announce_service() {
    const { node, app_id, net_addrs } = state;
    log({ register_app_web: app_id, static_dir: state.app_dir });
    node.publish("service-up", {
        app_id,
        type: "web-server",
        direct: state.direct,
        web_port: state.app_port,
        web_addr: net_addrs,
    });
}

/**
 * Inject App ID
 * For app services to have app-id context.
 */
function injectXAppId(req, res, next) {
    req.headers['x-app-id'] = state.app_id;
    next();
}

/**
 * Setup Application Handlers
 * Serving local app web assets and setting up middleware.
 */
async function setup_app_handlers() {
    app_handler
        .use(injectXAppId)
        .use(web.parse_query)
        .use((req, res, next) => {
            const url = req.url;
            const appurl = `/app/${state.app_id}`;
            if (!(url === appurl || url.startsWith(`${appurl}/`))) {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('404 Invalid URL');
            } else {
                const url = req.url = req.url.substring(appurl.length) || '/';
                if (url.indexOf('.') < 0) {
                    if (args.debug) console.log({ rewrite: req.url });
                    req.url = "/";
                }
                next();
            }
        })
        .use(require('serve-static')(`web/${state.app_dir}`, { index: ["index.html"] }))
        .use((req, res) => {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('404 Not Found');
        });
}

/**
 * Main Execution Function
 * Initializes the node, sets up handlers, starts listeners, and announces the service.
 */
(async () => {
    await setup_node();
    await setup_app_handlers();
    await web.start_web_listeners(state);
    await announce_service();
})();