"use strict";

const path = require("node:path");

function isDevelopmentMainScriptArg(value) {
    return typeof value === "string" && !value.startsWith("workadventure://") && value.endsWith(".js");
}

function createDefaultProtocolClientArgs(options) {
    const mainScriptArg = options.argv[1];
    if ((!options.defaultApp && !isDevelopmentMainScriptArg(mainScriptArg)) || options.argv.length < 2) {
        return [];
    }

    return [path.resolve(options.cwd, mainScriptArg)];
}

module.exports = {
    createDefaultProtocolClientArgs,
};
