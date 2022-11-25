import {fork} from "child_process";

export default function(env: {}) {
    return fork("tests/testServer.ts", {
        execArgv: ["ts-node"],
        env: env
    })
}
