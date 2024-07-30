/**
 * Provides WebSocket handlers for network (node/api/proxy) access.
 */

import { uuid, json, parse } from './utils.js';
const { protocol, hostname, port, pathname } = window.location;

/**
 * Establishes a WebSocket connection and handles reconnection on error/close.
 * @param {string} wsPath - WebSocket path.
 * @param {function} on_open - Callback function for WebSocket open event.
 * @param {function} on_msg - Callback function for WebSocket message event.
 * @param {number} retry - Retry interval for reconnection.
 */
export function ws_connect(wsPath = "", on_open, on_msg, retry = 10000) {
    const wsProtocol = protocol === 'https:' ? 'wss://' : 'ws://';
    const wsHost = hostname;
    const wsPort = port ? ':' + port : '';
    const wsUrl = wsProtocol + wsHost + wsPort + pathname + wsPath;
    const ws = new WebSocket(wsUrl);

    ws.onopen = (event) => {
        on_open(ws, event);
    };

    ws.onmessage = on_msg;

    ws.onerror = (event) => {
        console.error('WebSocket error:', event);
    };

    ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
        setTimeout(() => { ws_connect(wsPath, on_open, on_msg, retry) }, retry);
    };
}

/**
 * Sets up a WebSocket proxy API for interaction with the server.
 * @returns {Promise<Object>} - The proxy API object.
 */
export async function ws_proxy_api() {
    const ctx = {
        send: (msg) => {
            ctx.ws.send(json(msg));
        },
        once: {},
        subs: {},
        ready: []
    };

    const api = {
        publish: (topic, msg) => {
            ctx.send({ fn: "publish", topic, msg });
        },
        subscribe: (topic, handler, timeout) => {
            topic = topic.replace("$", ctx.app_id || 'unknown');
            ctx.subs[topic] = handler;
            ctx.send({ fn: "subscribe", topic, timeout });
        },
        call: (topic, msg, handler) => {
            if (!handler) {
                return api.pcall(topic, msg);
            }
            const mid = uuid();
            ctx.once[mid] = handler;
            ctx.send({ fn: "call", topic, msg, mid });
        },
        send: (topic, msg) => {
            ctx.send({ fn: "send", topic, msg });
        },
        locate: (topic, handler) => {
            if (!handler) {
                return api.plocate(topic);
            }
            const mid = uuid();
            ctx.once[mid] = handler;
            ctx.send({ fn: "locate", topic, mid });
        },
        pcall: (topic, msg) => {
            return new Promise((resolve, reject) => {
                api.call(topic, msg, (msg, error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(msg);
                    }
                });
            });
        },
        plocate: (topic) => {
            return new Promise((resolve, reject) => {
                api.locate(topic, (msg, error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(msg);
                    }
                });
            });
        },
        on_ready: (fn) => {
            if (ctx.app_id) {
                fn(ctx.app_id);
            } else {
                ctx.ready.push(fn);
            }
        }
    };

    return new Promise(resolve => {
        ws_connect("proxy.api", ws => {
            ctx.ws = ws;
            resolve(api);
        }, event => {
            const ws_msg = parse(event.data);
            const { pub, msg, app_id } = ws_msg;
            if (app_id) {
                ctx.app_id = app_id;
                console.log({ app_id });
                ctx.ready.forEach(fn => fn(app_id));
            } else if (pub) {
                const handler = ctx.subs[pub];
                if (handler) {
                    handler(msg, pub);
                } else {
                    console.log({ missing_sub: pub, subs: ctx.subs });
                }
            } else {
                const { mid, topic, error } = ws_msg;
                const handler = ctx.once[mid];
                delete ctx.once[mid];
                if (!handler) {
                    console.log({ missing_once: mid, ws_msg });
                } else if (error) {
                    handler(undefined, error, topic);
                } else {
                    handler(msg, undefined, topic);
                }
            }
        });
    });
}