import {fork} from "child_process";

export default function(env: {}) {
    return fork("tests/testServer.ts", {
        execArgv: ["./node_modules/.bin/ts-node"],
        env: env
    })
}
