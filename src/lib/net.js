/**
 * AI Travel Companion ZeroMQ Network Utilities
 *
 * This module provides helper functions and classes for setting up ZeroMQ client and server nodes within the AI Travel Companion application.
 * It enables robust pub/sub and direct messaging patterns, ensuring reliable communication between different components of the application.
 * 
 * Key functionalities include:
 * - Configuring and managing ZeroMQ server (Router) and client (Dealer) sockets
 * - Implementing a task-based message sender to ensure non-blocking operations
 * - Setting up pub/sub and direct messaging for various application endpoints
 * - Handling heartbeats and client health checks to maintain connection stability
 * - Providing utilities for network address retrieval and configuration settings
 * 
 * Usage:
 * - Initialize server and client nodes with specified options and handlers
 * - Use provided API methods for publishing, subscribing, calling, and handling messages
 * - Configure heartbeat intervals and client timeouts for optimal performance
 * 
 * Note: This module is essential for enabling real-time communication and data exchange in the AI Travel Companion application.
 */

const zeromq = require("zeromq");
const util = require('./util');
const log = util.logpre('zmq');
const os = require('os');

const { Dealer, Router } = zeromq;
const { args, env, json } = util;
const proto = "tcp";
const settings = {
    debug_node: env('DEBUG_NODE') || args['debug-node'] || false,
    stats_timer: env('STATS_TIMER') || args['stats-timer'] || 60, // in seconds
    dead_client: env('NODE_DEAD_MS') || args['node-dead-ms'] || 5000,
    heartbeat: env('NODE_BEAT_MS') || args['node-beat-ms'] || 1000,
};

function zmq_settings(rec) {
    Object.assign(settings, rec);
}

/**
 * Task-based message sender to ensure non-blocking operations
 */
class Sender {
    constructor(socket) {
        this.socket = socket;
        this.queue = [];
        this.active = false;
    }

    async send(message) {
        this.queue.push(async () => {
            await this.socket.send(message);
        });
        this.processQueue();
    }

    async processQueue() {
        if (this.active || this.queue.length === 0) {
            return;
        }
        this.active = true;
        const task = this.queue.shift();
        try {
            await task();
        } catch (error) {
            console.error('Task failed:', error, task);
        } finally {
            this.active = false;
            this.processQueue();
        }
    }
}

function zmq_server(port, onmsg, opt = { sync: false, secret: "raw" }) {
    const sock = new Router();
    const sender = new Sender(sock);
    const cidmap = {};
    const cidauth = {};

    function send(cid, msg) {
        const id = cidmap[cid];
        if (id) {
            sender.send([id, json(msg)]);
            return true;
        } else {
            log({ server_send_to_missing_cid: cid, msg });
            return false; // dead endpoint
        }
    }

    function remove(cid) {
        delete cidmap[cid];
    }

    function parse(msg, default_value) {
        try {
            return JSON.parse(msg);
        } catch (error) {
            log({ parse_error: msg.toString() });
            return default_value;
        }
    }

    function decodeCID(id) {
        try {
            return id.readUInt32BE(1).toString(36).toUpperCase();
        } catch (e) {
            log({ invalid_CID: id });
            return undefined;
        }
    }

    (async function() {
        await sock.bind(`${proto}://*:${port}`);
        log({ listening: proto, port, opt });

        for await (const [id, msg] of sock) {
            const cid = decodeCID(id);
            if (cid === undefined) {
                continue;
            }
            cidmap[cid] = id;
            const req = parse(msg);
            if (req === undefined) {
                log({ empty_request_from: cid });
                continue;
            }
            if (opt.secret) {
                if (req.auth === opt.secret) {
                    cidauth[cid] = req.auth;
                    continue;
                }
                if (cidauth[cid] !== opt.secret) {
                    log({ client_unauthorized: cid });
                    continue;
                }
            }
            const rep = await onmsg(req, cid, send);
            if (rep !== undefined) {
                const pro = sock.send([id, json(rep)]);
                if (opt.sync) await pro;
            }
        }
    }());

    return { send, remove };
}

function zmq_client(host = "127.0.0.1", port, opt = { secret: "raw" }) {
    const address = `${proto}://${host}:${port}`;
    let sock;
    let sender;

    async function send(request) {
        if (!sock) throw "not connected";
        await sender.send(json(request));
    }

    async function recv() {
        if (!sock) throw "not connected";
        const [result] = await sock.receive();
        return JSON.parse(result);
    }

    function recvp() {
        if (!sock) throw "not connected";
        return new Promise(resolve => {
            sock.receive().then(msg => {
                const [result] = msg;
                resolve(JSON.parse(result));
            });
        });
    }

    async function call(request) {
        await send(request);
        return await recv();
    }

    function connect() {
        if (sock) return;
        sock = new Dealer();
        sock.connect(address);
        sender = new Sender(sock);
        if (opt.secret) {
            send({ auth: opt.secret });
        }
        log({ connected: `${host}:${port}` });
    }

    function disconnect() {
        if (sock) {
            sock.disconnect(address);
            sock = undefined;
        }
    }

    function reconnect() {
        disconnect();
        connect();
    }

    connect();

    return { send, recv, call, connect, disconnect, reconnect, recvp };
}

function zmq_proxy(port = 6000, opt = { secret: "raw" }) {
    const seed = Date.now();
    const clients = {};
    const ttimer = {}; // topic timers for ephemeral ~topics
    const topics = {}; // map topics to cid interest lists
    const direct = {}; // map direct handlers to cid interest lists
    const watch = {}; // track active callers to allow dead node errors
    let toplist = [];
    let topstar = [];
    const stats = {
        errs: 0,
        pubs: 0,
        subs: 0,
        epubs: 0,
        esubs: 0,
        etimo: 0,
        hands: 0,
        calls: 0,
        repls: 0,
        deads: 0,
    };

    log({ proxy_host: host_addrs() });

    const blast = function(send, subs, msg, exclude = []) {
        for (let cid of subs) {
            if (!exclude.includes(cid)) {
                send(cid, msg);
                exclude.push(cid);
            }
        }
    };

    const update_ttimer = function(topic, msg) {
        if (topic.charAt(0) === '~') {
            const last = Date.now();
            const lastrec = ttimer[topic] || { last: 0, timeout: 60 * 5 };
            const timeout = (msg ? msg.timeout : lastrec.timeout);
            ttimer[topic] = Object.assign(lastrec, { last, timeout });
        }
    };

    const server = zmq_server(port, (recv, cid, send) => {
        clients[cid] = Date.now();
        if (typeof recv === 'number') {
            return;
        }
        if (!Array.isArray(recv)) {
            log({ invalid_request: recv, from: cid });
            return;
        }
        let [action, topic, msg, callto, mid] = recv;
        const etopic = topic && topic.charAt(0) === '~';
        const sent = [];
        switch (action) {
            case 'sub':
                (topics[topic] = topics[topic] || []).push(cid);
                toplist = Object.keys(topics);
                topstar = toplist.filter(t => t.endsWith("/*"));
                update_ttimer(topic, msg);
                etopic ? stats.esubs++ : stats.subs++;
                break;
            case 'pub':
                const subs = topics[topic] || [];
                const tmsg = ['pub', topic, msg, cid];
                blast(send, subs, tmsg, sent);
                if (topic.indexOf('/') > 0) {
                    const match = topic.substring(0, topic.lastIndexOf('/'));
                    for (let key of topstar) {
                        if (key.startsWith(match)) {
                            blast(send, topics[key] || [], tmsg, sent);
                        }
                    }
                }
                blast(send, topics['*'] || [], tmsg, sent);
                update_ttimer(topic);
                etopic ? stats.epubs++ : stats.pubs++;
                break;
            case 'call':
                if (!callto) {
                    const candidates = direct[topic] || [];
                    const rnd = Math.round(Math.random() * (candidates.length - 1));
                    callto = candidates[rnd];
                }
                if (!send(callto, ['call', topic, msg, cid, mid])) {
                    log({ notify_caller_of_dead_endpoint: topic, cid, callto });
                                        send(cid, ['err', `dead endpoint: ${topic}`, callto, mid]);
                    stats.deads++;
                } else {
                    (watch[callto] = watch[callto] || []).push({ cid, topic, callto, mid });
                    stats.calls++;
                }
                break;
            case 'err':
                send(callto, ['err', msg, cid, mid]);
                stats.errs++;
                break;
            case 'repl':
                send(callto, ['repl', msg, mid]);
                const watchers = watch[cid];
                if (watchers) {
                    const nu = watch[cid] = watchers.filter(rec => rec.mid !== mid);
                    if (nu.length === 0) {
                        delete watch[cid];
                    }
                    stats.repls++;
                } else {
                    log({ no_watchers_found: cid, msg, callto, mid });
                }
                break;
            case 'handle':
                (direct[topic] = direct[topic] || []).push(cid);
                stats.hands++;
                break;
            case 'locate':
                send(cid, ['loc', topic ? topics[topic] : topics, topic ? direct[topic] : direct, mid]);
                break;
            default:
                log({ invalid_action: action });
                break;
        }
    }, opt);

    setInterval(() => {
        let sum = 0;
        const keys = Object.keys(stats);
        keys.forEach(key => sum += stats[key]);
        if (sum) {
            log({ stats });
            keys.forEach(key => stats[key] = 0);
        }
    }, settings.stats_timer * 1000);

    setInterval(() => {
        const cid_list = Object.keys(clients);
        for (let cid of cid_list) {
            const delta = Date.now() - clients[cid];
            if (delta > settings.dead_client) {
                const watchers = watch[cid];
                if (watchers && watchers.length) {
                    log({ removing_watched_client: cid, watchers });
                }
                for (let [key, topic] of Object.entries(topics)) {
                    topics[key] = topic.filter(match => match !== cid);
                }
                for (let [key, topic] of Object.entries(direct)) {
                    direct[key] = topic.filter(match => match !== cid);
                }
                for (let rec of watch[cid] || []) {
                    const { cid, topic, callto, mid } = rec;
                    server.send(cid, ['err', `dead endpoint: ${topic}`, callto, mid]);
                }
                server.send(cid, ['dead', 'you have been marked dead', delta]);
                delete clients[cid];
                delete watch[cid];
                server.remove(cid);
            } else {
                server.send(cid, seed);
            }
        }
        const time = Date.now();
        for (let [topic, rec] of Object.entries(ttimer)) {
            if (time > rec.last + rec.timeout * 1000) {
                delete ttimer[topic];
                delete topics[topic];
                stats.etimo++;
            }
        }
    }, settings.heartbeat);
}

/** Broker node capable of pub, sub, and direct messaging */
function zmq_node(host = "127.0.0.1", port = 6000) {
    const client = zmq_client(host, port);
    const handlers = {};
    const subs = {};
    const once = {};
    const seed = Date.now();
    let substar = [];
    let lastHB = Infinity;
    let lastHT = Date.now();
    let on_disconnect = [];
    let on_reconnect = [];
    let on_connect = [];

    (async () => {
        while (true) {
            await next_message();
        }
    })();

    setInterval(() => {
        if (lastHT) {
            client.send(seed);
            const delta = Date.now() - lastHT;
            if (delta > settings.dead_client) {
                log({ proxy_dead_after: delta });
                on_disconnect.forEach(fn => fn());
                lastHT = 0;
            }
        } else {
            for (let [mid, fn] of Object.entries(once)) {
                fn(undefined, "proxy down");
                delete once[mid];
            }
        }
        if (settings.debug_node) {
            log({ client_hb: { seed, lastHT, delta: Date.now() - lastHT } });
        }
    }, settings.heartbeat);

    function heartbeat(rec) {
        if (settings.debug_node) {
            log({ proxy_hb: rec });
        }
        if (rec !== lastHB) {
            if (lastHB === Infinity) {
                on_connect.forEach(fn => fn());
            }
            if (lastHB !== Infinity) {
                for (let [topic, handler] of Object.entries(subs)) {
                    client.send(["sub", topic]);
                }
                for (let [topic, handler] of Object.entries(handlers)) {
                    client.send(["handle", topic]);
                }
                on_reconnect.forEach(fn => fn());
            }
            lastHB = rec;
        }
        lastHT = Date.now();
    }

    async function next_message() {
        const rec = await client.recv();
        if (typeof rec === 'number') {
            return heartbeat(rec);
        }
        switch (rec.shift()) {
            case 'pub':
                {
                    const [topic, msg, cid] = rec;
                    const endpoint = subs[topic];
                    if (endpoint) {
                        return endpoint(msg, cid, topic);
                    }
                    for (let star of substar) {
                        if (topic.startsWith(star)) {
                            return subs[`${star}*`](msg, cid, topic);
                        }
                    }
                    const star = subs['*'];
                    if (star) {
                        return star(msg, cid, topic);
                    }
                }
                break;
            case 'call':
                {
                    const [topic, msg, cid, mid] = rec;
                    const endpoint = handlers[topic];
                    if (!endpoint) {
                        return log('call handle', { missing_call_handler: topic });
                    }
                    endpoint(msg, topic, cid).then(msg => {
                        client.send(["repl", '', msg, cid, mid]);
                    }).catch(error => {
                        log({ call_error: error });
                        client.send(['err', '', error.toString(), cid, mid]);
                    });
                }
                break;
            case 'repl':
                {
                    const [msg, mid] = rec;
                    const reply = once[mid];
                    if (!reply) {
                        return log({ missing_once_reply: mid });
                    }
                    delete once[mid];
                    try {
                        return reply(msg);
                    } catch (error) {
                        log({ once_error: error });
                        return;
                    }
                }
                break;
            case 'loc':
                {
                    const [subs, direct, mid] = rec;
                    const reply = once[mid];
                    if (!reply) {
                        return log({ missing_once_locate: mid });
                    }
                    delete once[mid];
                    return reply({ subs, direct });
                }
                break;
            case 'err':
                {
                    const [error, callto, mid] = rec;
                    const handler = once[mid];
                    if (handler) {
                        delete once[mid];
                        handler(undefined, error);
                    } else {
                        log({ missing_error_once: mid, callto });
                    }
                }
                break;
            case 'dead':
                log({ marked_dead: rec });
                lastHB--;
                client.reconnect();
                break;
            default:
                log({ next_unhandled: rec });
                return;
        }
    }

    function flat(topic) {
        return Array.isArray(topic) ? topic.join('/') : topic;
    }

    const api = {
        publish: (topic, message) => {
            client.send(["pub", flat(topic), message]);
        },
        subscribe: (topic, handler, timeout) => {
            topic = flat(topic);
            client.send(["sub", topic, { timeout: timeout ? (timeout.timeout || timeout) : undefined }]);
            subs[topic] = handler;
            substar = Object.keys(subs)
                .filter(k => k.endsWith("*"))
                .map(k => k.substring(0, k.length - 1));
        },
        call: function () {
            let cid = '', topic, message, on_reply;
            const args = [...arguments];
            if (typeof (args[args.length - 1]) === 'function') {
                if (args.length === 4) {
                    [cid, topic, message, on_reply] = args;
                    if (cid === '' && settings.debug_node) {
                        console.trace({ antique_call_sig: topic });
                    }
                } else if (args.length === 3) {
                    [topic, message, on_reply] = args;
                } else {
                    throw "invalid call signature";
                }
            } else {
                if (args.length === 3) {
                    [cid, topic, message] = args;
                } else if (args.length === 2) {
                    [topic, message] = args;
                } else {
                    throw "invalid call signature";
                }
                return api.promise.call(cid, topic, message);
            }
            if (!(topic && message && on_reply)) {
                throw "invalid call args";
            }
            const mid = util.uid();
            once[mid] = on_reply;
            client.send(["call", flat(topic), message, cid, mid]);
        },
        send: (cid, topic, message) => {
            client.send(["call", flat(topic), message, cid, ""]);
        },
        handle: (topic, handler) => {
            client.send(["handle", flat(topic)]);
            handlers[flat(topic)] = handler;
        },
        locate: (topic, on_reply) => {
            const mid = util.uid();
            once[mid] = on_reply;
            client.send(["locate", flat(topic), '', '', mid]);
        },
        on_connect: (fn) => {
            on_connect.push(fn);
            return api;
        },
        on_reconnect: (fn) => {
            on_reconnect.push(fn);
            return api;
        },
        on_disconnect: (fn) => {
            on_disconnect.push(fn);
            return api;
        },
        is_connected: () => {
            return lastHT !== 0;
        }
    };

    api.promise = {
        call: function () {
            return new Promise((resolve, reject) => {
                api.call(...arguments, (msg, error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(msg);
                    }
                });
            });
        },
        locate: (topic) => {
            return new Promise((resolve, reject) => {
                api.locate(topic, (msg, error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(msg);
                    }
                });
            });
        }
    };

    return api;
}

function host_addrs() {
    const networkInterfaces = os.networkInterfaces();
    const addr = [];

    for (const interface in networkInterfaces) {
        for (const networkInterface of networkInterfaces[interface]) {
            if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
                addr.push(networkInterface.address);
            }
        }
    }

    return addr;
}

Object.assign(exports, {
    host_addrs,
    server: zmq_server,
    client: zmq_client,
    proxy: zmq_proxy,
    node: zmq_node,
    set: zmq_settings
});

if (require.main === module) {
    if (args.run === "proxy") {
        zmq_proxy(args.port);
    }

    if (args.run === "addr") {
        console.log(host_addrs());
    }
}