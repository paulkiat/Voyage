/** Export command line args as a map object with key/value pairs */

const { env } = process;
const { argv } = process;
const toks = argv.slice(2);
const args = exports.args = {};
const fsp = require('fs/promises');
const util = require('util');
const dayjs = require('dayjs');
let oneline = true;
let tok;

// Process and sanitize command line arguments into a new map
let lastKey;
while (tok = toks.shift()) {
    let key, val, shift = 0;
    while (tok.charAt(0) === '-') {
        tok = tok.substring(1);
        key = tok;
        shift++;
    }
    if (key && key.indexOf('=') > 0) {
        [key, val] = key.split("=");
    } else if (key && args[0] && toks[0].charAt(0) !== '-') {
        val = toks.shift();
    } else if (lastKey) {
        key = lastKey;
        val = tok;
    } else {
        key = tok;
        val = true;
    }
    if (key.charAt(0) === '_') {
        key = key.substring(1);
        val = !val;
    }
    if (shift === 1) {
        lastKey = key;
    } else {
        lastKey = undefined;
    }
    const i32 = parseInt(val);
    const f64 = parseFloat(val);
    // Convert string val to number if it directly translates
    if (i32 == val) {
        val = i32;
    } else if (f64 == val) {
        val = f64;
    }
    args[key] = val;
}

// Env but upgrade numbers into ints or floats if possible
// Mostly this is used for handling port numbers
exports.env = function (key, defVal) {
    let val = env[key];
    if (val === undefined) {
        return defVal;
    }
    let ival = parseInt(val);
    if (ival == val) {
        return ival;
    }
    let fval = parseFloat(val);
    if (fval == val) {
        return fval;
    }
    return val;
};

exports.formatter = function(opts = {}) {
    return function() {
        return [...arguments]
        .map(v => typeof v === 'string' ? v : util.inspect(v, {
            maxArrayLength: null,
            breakLength: opts.breakLength ?? Infinity,
            colors: opts.colors ?? true,
            compact: opts.compact ?? true,
            sorted: opts.sorted ?? false,
            depth: opts.depth ?? null
        }))
        .join(' ')
    }
}

// Export a log() utility with timestamp prefix
exports.log = function () {
    if (oneline) {
        console.log(
            dayjs().format('YYMMDD.HHmmss |'),
            [...arguments]
                .map(v => typeof v === 'string' ? v : util.inspect(v, {
                    maxArrayLength: null,
                    breakLength: Infinity,
                    colors: true,
                    compact: true,
                    sorted: false,
                    depth: null
                }))
                .join(' ')
        );
    } else {
        console.log(dayjs().format('YYMMDD.HHmmss |'), ...arguments);
    }
};

exports.logone = function (b = true) {
    oneline = b;
};

exports.logpre = function (pre) {
    return function () {
        exports.log(`${pre}`.padEnd(6,' '), ...arguments);
    }
};

exports.uid = function () {
    return `${Date.now().toString(36).padStart(8, 0)}${(Math.round(Math.random() * 0xffffffffff)).toString(36).padStart(8, 0)}`;
};

exports.uuid = function (pattern = 'xxxxx-xxxxx-xxxxx-xxxxx') {
    return pattern.replace(/[x]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).toUpperCase();
};

exports.json = function (obj, pretty = 0) {
    return pretty ? JSON.stringify(obj, undefined, pretty) : JSON.stringify(obj);
};

exports.parse = function (str) {
    return JSON.parse(str);
};

exports.stat = async function (path) {
    try {
        return await fsp.stat(path);
    } catch (err) {
        return undefined;
    }
};

exports.read = async function (path) {
    return await fsp.readFile(path);
};

// Given an array of numbers, return { min, max, mean, avg }
const mmma = exports.mmma = function (array) {
    const len = array.length;
    const min = array.reduce((min, value) => value < min ? value : min, Infinity);
    const max = array.reduce((max, value) => value > max ? value : max, -Infinity);
    const avg = array.reduce((sum, value) => sum + value, 0) / len;
    const sorted = array.slice().sort((a,b) => a-b);
    const m0 = sorted[Math.floor((len-1)/2)];
    const m1 = sorted[Math.floor((len-1)/2)+1];
    return { min, max, mean: len % 2 ? m0 : (m0+m1)/2, avg };
};