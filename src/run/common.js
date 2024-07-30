// Common helpers for all run-*.js

const { fork } = require('child_process');
const util = require('../lib/util'); // Adjust this path if necessary
const { args, env } = util;
const debug = env('DEBUG') || args.debug;

let lastModule;

/**
 * Logs the output of a given module to the console.
 * @param {string} name - The name of the module.
 * @param {Buffer|string} data - The data to log.
 * @param {boolean} err - Flag indicating if the data is from stderr.
 */
function log(name, data, err) {
    const str = data.toString();
    if (str.length === 0) {
        return;
    }
    if (name !== lastModule) {
        console.log(`\n----------( ${name} )----------`);
        lastModule = name;
    }
    process.stdout.write(str);
}

/**
 * Launches a new process for the given module with specified arguments.
 * @param {string} name - The name of the module.
 * @param {string} path - The path to the module's entry point.
 * @param {string[]} modArgs - The arguments to pass to the module.
 * @returns {ChildProcess} - The forked child process.
 */
function launch(name, path, modArgs) {
    if (debug) modArgs.push(`--debug=${debug}`);
    if (args.prod) modArgs.push("--prod");
    if (args["cli-store"]) modArgs.push("--cli-store");
    const mod = fork(path, modArgs, { silent: true });
    if (args.err || args.stderr || env('STDERR')) {
        mod.stderr.on("data", data => log(name, data, true));
    }
    mod.stdout.on("data", data => log(name, data, false));
    mod.on("exit", (exit) => {
        console.log({ module: name, exited: exit });
    });
    if (args.debug) console.log({ starting: name });
    return mod;
}

module.exports = {
    args: util.args,
    log,
    launch,
    fork
};