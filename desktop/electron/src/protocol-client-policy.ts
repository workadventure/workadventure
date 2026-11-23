import path from "node:path";

function isDevelopmentMainScriptArg(value: string | undefined): value is string {
    return typeof value === "string" && !value.startsWith("workadventure://") && value.endsWith(".js");
}

export function createDefaultProtocolClientArgs(options: {
    defaultApp: boolean;
    argv: string[];
    cwd: string;
}): string[] {
    const mainScriptArg = options.argv[1];
    if ((!options.defaultApp && !isDevelopmentMainScriptArg(mainScriptArg)) || options.argv.length < 2) {
        return [];
    }

    return [path.resolve(options.cwd, mainScriptArg)];
}
