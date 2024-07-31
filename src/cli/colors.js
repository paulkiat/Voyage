const MOD = {
    reset: 0,
    bold: 1,
    dim: 2,
    italic: 3,
    underline: 4,
    inverse: 7,
    hidden: 8,
    strikethrough: 9
};

const FG = {
    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    magenta: 35,
    cyan: 36,
    white: 37
};

const BG = {
    black: 40,
    red: 41,
    green: 42,
    yellow: 43,
    blue: 44,
    magenta: 45,
    cyan: 46,
    white: 47
};

function color(v) {
    const colors = [ ...arguments ].slice(1) || MOD.reset;
    return `\x1b[${colors.join(';')}m${v.toString()}\x1b[0m`;
}

Object.assign(exports, {
    MOD,
    FG,
    BG,
    color
});
