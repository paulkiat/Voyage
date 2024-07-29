/**
 * init + configs all back end web servers
 * 
 * looks for admn/app/web/ws/wss
 * 
 * 
 */
const util = require('../lib/util');
const log = util.logpre('travel');
const path = require('path');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const crypto = require('../lib/crypto');
const servers = {};

const MS_DAYS_300 = 300 * 24 * 60 * 60 * 1000;

async function startServer(state) {
    if (!https) {
        return log('HTTPS support is missing');
    }

    const {
        meta,
        adminHandler,
        appHandler,
        webHandler,
        wsHandler,
        wssHandler
    } = state;

    if (adminHandler) {
        log({ startAdminListener: state.adminPort });
        servers.admin = http.createServer(adminHandler).listen(state.adminPort, 'localhost');
    }

    if (state.appPort !== undefined && appHandler) {
        servers.app = http.createServer(appHandler).listen(state.appPort);
        state.appPort = servers.app.address().port;
        log({ startAppListener: state.appPort });
    }

    if (wsHandler && servers.app) {
        const wsServer = servers.ws = new WebSocket.Server({ server: servers.app });
        wsServer.on('connection', wsHandler);
        wsServer.on('error', error => {
            log({ wsServerError: error });
        });
    }

    if (webHandler && (!state.ssl || Date.now() - state.ssl.date > MS_DAYS_300)) {
        state.ssl = await meta.get("ssl-keys");
        let found = state.ssl !== undefined;
        if (state.sslDir) {
            const dir = await util.stat(state.sslDir);
            if (dir && dir.isDirectory()) {
                const key = await util.stat(path.join(state.sslDir, 'key.pem'));
                const cert = await util.stat(path.join(state.sslDir, 'cert.pem'));
                if (key && key.isFile() && cert && cert.isFile()) {
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
            log({ generating: 'new SSL keys' });
            state.ssl = await crypto.createWebKeyAndCert();
            await meta.put("ssl-keys", state.ssl);
        }
    }

    if (webHandler) {
        servers.web = https.createServer({
            key: state.ssl.key,
            cert: state.ssl.cert
        }, webHandler).listen(state.webPort);
        log({ startWebListener: state.webPort });
    }

    if (wssHandler && servers.web) {
        const wss = servers.wss = new WebSocket.Server({ server: servers.web });
        wss.on('connection', wssHandler);
        wss.on('error', error => {
            log({ wssServerError: error });
        });
    }
}

function parseQuery(req, res, next) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams.entries());
    req.parsed = { url, query };
    if (req.url.startsWith("/app/")) {
        const tok = req.parsed.url.pathname.slice(1).split("/");
        req.parsed.appId = tok[1];
        req.parsed.appPath = tok.slice(2).join("/");
    }
    next();
}

function notFoundHandler(req, res, next) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
}

function wsProxyHandler(node, ws, wsMsg) {
    let { fn, topic, msg, mid, timeout } = util.parse(wsMsg);
    topic = topic || '';
    if (topic.indexOf("$") >= 0) {
        topic = topic.replace("$", ws.appId || 'unknown');
    }
    switch (fn) {
        case 'publish':
            node.publish(topic, msg);
            break;
        case 'subscribe':
            node.subscribe(topic, (msg, cid, topic) => {
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
            ws.send(util.json({ mid, topic, error: `invalid function: ${fn}` }));
            break;
    }
}

function wsProxyEndpoint(node, path = "/proxy.api", pass) {
    log({ installingWsProxy: path });
    return function (ws, req) {
        if (req.url.startsWith("/app/")) {
            const pathTokens = req.url.split('/');
            req.url = "/" + pathTokens.slice(3).join('/');
            ws.appId = pathTokens[2];
        }
        if (req.url === path) {
            ws.on('message', (msg) => {
                wsProxyHandler(node, ws, msg);
            });
            ws.on('error', error => {
                log({ wsError: error });
            });
            if (ws.appId) {
                ws.send(util.json({ appId: ws.appId }));
            }
        } else {
            if (pass) {
                return pass(ws, req);
            }
            log({ invalidWsUrl: req.url });
            ws.close();
        }
    };
}

module.exports = {
    startServer,
    wsProxyHandler,
    wsProxyEndpoint,
    notFoundHandler,
    parseQuery,
};