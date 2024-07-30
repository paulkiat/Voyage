// WebSocket API client (browser) for implementing function calls
// Not for calling API app services, that's handled by ws-net.js

import { json, parse, uid } from './utils.js';
import { ws_connect } from './ws-net.js';

/**
 * Class to manage WebSocket calls.
 */
class WsCall {
    #context = {
        on_connect: [],
        calls: {},
        ws: undefined
    };

    /**
     * Constructor to initialize WebSocket connection.
     * @param {string} wsPath - WebSocket path.
     */
    constructor(wsPath) {
        ws_connect(wsPath, ws => this.#_on_connect(ws), msg => this.#_on_message(msg));
    }

    /**
     * Report errors to console.
     * @param {Error} error - Error object.
     */
    report(error) {
        console.log(error);
    }

    /**
     * Add a callback function to be called on WebSocket connection.
     * @param {function} fn - Callback function.
     */
    on_connect(fn) {
        this.#context.on_connect.push(fn);
        if (this.#context.ws) {
            fn();
        }
    }

    /**
     * Private method to handle WebSocket connection.
     * @param {WebSocket} socket - WebSocket instance.
     */
    #_on_connect(socket) {
        this.#context.ws = socket;
        this.#context.on_connect.forEach(fn => fn());
    }

    /**
     * Private method to handle incoming WebSocket messages.
     * @param {MessageEvent} msg - WebSocket message event.
     */
    #_on_message(msg) {
        const { cid, args, error } = parse(msg.data);
        const handler = this.#context.calls[cid];
        if (handler) {
            delete this.#context.calls[cid];
            handler(args, error);
        } else {
            console.log({ api_ws_msg: msg });
        }
    }

    /**
     * Private method to send a message via WebSocket.
     * @param {Object} msg - Message to send.
     */
    #_send(msg) {
        this.#context.ws.send(json(msg));
    }

    /**
     * Make a WebSocket call.
     * @param {string} cmd - Command to send.
     * @param {Object} args - Arguments for the command.
     * @returns {Promise} - Promise resolving with the response or rejecting with an error.
     */
    async call(cmd, args) {
        const msg = {
            cid: uid(),
            cmd,
            args
        };
        return new Promise((resolve, reject) => {
            this.#context.calls[msg.cid] = (args, error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(args);
                }
            };
            this.#_send(msg);
        });
    }
}

export default WsCall;