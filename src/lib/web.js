/**
 * Startup wrapper for all backend web servers for AI Travel Companion
 *
 * Looks for adm/app/web/ws/wss handlers and attaches them
 * Provides secure and insecure web and WebSocket servers
 */

const ms_days_330 = 330 * 24 * 60 * 60 * 1000;
const util = require('../lib/util');
const log = util.logpre('web');
const path = require('path');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const crypto = require('../lib/crypto');
const servers = {};

async function startWebListeners(state) {
    if (!https) {
        return log('missing https support');
    }
    const {
        meta,
        admHandler,
        webHandler,
        appHandler,
        wssHandler,
        wsHandler
    } = state;

    // Admin web port listens only locally
    if (admHandler) {
        log({ startAdmListener: state.admPort });
        servers.adm = http.createServer(admHandler).listen(state.admPort, 'localhost');
    }

    // App web port listens to http, but should only allow requests
    // from localhost or the organizational web proxy
    if (state.appPort !== undefined && appHandler) {
        servers.app = http.createServer(appHandler).listen(state.appPort);
        state.appPort = servers.app.address().port;
        log({ startAppListener: state.appPort });
    }

    // Start insecure WebSocket handler (for internal app server)
    if (wsHandler && servers.app) {
        const wss = servers.ws = new WebSocket.Server({ server: servers.app });
        wss.on('connection', wsHandler);
        wss.on('error', error => {
            log({ wsServError: error });
        });
    }

    // Generate new https keys if missing or over 300 days old
    if (webHandler && (!state.ssl || Date.now() - state.ssl.date > ms_days_330)) {
        state.ssl = await meta.get("ssl-keys");
        let found = state.ssl !== undefined;
        if (state.sslDir) {
            // Look for a key.pem and cert.pem file in
            const dir = await util.stat(state.sslDir);
            if (dir && dir.isDirectory()) {
                const key = await util.stat(path.join(state.sslDir, 'key.pem'));
                const crt = await util.stat(path.join(state.sslDir, 'cert.pem'));
                if (key && key.isFile() && crt && crt.isFile()) {
                    state.ssl = {
                        key: await util.read(path.join(state.sslDir, 'key.pem')),
                        cert: await util.read(path.join(state.sslDir, 'cert.pem')),
                        date: Math.round(key.mtimeMs)
                    };
                    await meta.put("ssl-keys", state.ssl);
                    found = true;
                }
            }
        }
        if (!found) {
            log({ generating: 'https private key and x509 cert' });
            state.ssl = await crypto.createWebKeyAndCert();
            await meta.put("ssl-keys", state.ssl);
        }
    }

    // Open secure web port handles customer/org requests
    if (webHandler) {
        servers.web = https.createServer({
            key: state.ssl.key,
            cert: state.ssl.cert
        }, webHandler).listen(state.webPort);
        log({ startWebListener: state.webPort });
    }

    // Start secure WebSocket handler
    if (wssHandler && servers.web) {
        const wss = servers.wss = new WebSocket.Server({ server: servers.web });
        wss.on('connection', wssHandler);
        wss.on('error', error => {
            log({ wsServError: error });
        });
    }
}

// Adds a `parsed` object to the `req` request object
function parse_query(req, res, next) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams.entries());
    const parsed = req.parsed = { url, query };
    // Add app_id and app_path if it's an app url
    if (req.url.startsWith("/app/")) {
        const tok = req.parsed.url.pathname.slice(1).split("/");
        parsed.app_id = tok[1];
        parsed.app_path = tok.slice(2).join("/");
    }
    next();
}

// Most basic 404 handler
function four_oh_four(req, res, next) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('404 Not Found');
}

// Web-server handler to support browser-side proxy/api calls
// In the browser, use the `web/lib/ws-net.js` class
function wsProxyHandler(node, ws, wsMsg) {
    let { fn, topic, msg, mid, timeout } = util.parse(wsMsg);
    // Ensure top is not null (which locate allows)
    topic = topic || '';
    // Rewrite topics containing $ and replace with app-id
    if (topic.indexOf("$") >= 0) {
        topic = topic.replace("$", ws.app_id || 'unknown');
    }
    switch (fn) {
        case 'publish':
            node.publish(topic, msg);
            break;
        case 'subscribe':
            node.subscribe(topic, (msg, cid, topic) => {
                // Handler for messages sent to the subscribed topic
                ws.send(util.json({ pub: topic, msg }));
            }, timeout);
            break;
        case 'call':
            node.call(topic, msg, (msg, error) => {
                ws.send(util.json({ mid, msg, topic, error }));
            });
            break;
        case 'locate':
            node.locate(topic, (msg, error) => {
                ws.send(util.json({ mid, msg, topic, error }));
            });
            break;
        default:
            ws.send(util.json({ mid, topic, error: `invalid proxy fn: ${fn}` }));
            break;
    }
}

// Server-side endpoint for client web sockets talking to proxy (broker)
function wsProxyPath(node, path = "/proxy.api", pass) {
    log({ installingWsProxy: path });
    return function(ws, req) {
        // Extract app-id from url
        if (req.url.startsWith("/app/")) {
            const pathTok = req.url.split('/');
            req.url = "/" + pathTok.slice(3).join('/');
            ws.app_id = pathTok[2];
        }
        if (req.url === path) {
            ws.on('message', (msg) => {
                wsProxyHandler(node, ws, msg);
            });
            ws.on('error', error => {
                log({ wsError: error });
            });
            if (ws.app_id) {
                // If app connection, let app know its id
                ws.send(util.json({ app_id: ws.app_id }));
            }
        } else {
            // Optional pass-thru handler if it's not an app/proxied connection
            if (pass) {
                return pass(ws, req);
            }
            log({ invalidWsUrl: req.url });
            ws.close();
        }
    };
}

Object.assign(exports, {
    startWebListeners,
    wsProxyHandler,
    wsProxyPath,
    four_oh_four,
    parse_query,
});