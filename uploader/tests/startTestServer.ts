import {spawn} from "child_process";

export default function(env: {}) {
    const process = spawn("yarn", ['startTestServer']);

    /*process.stdout.on('data', (data) => {
        console.log(data.toString());
    });*/
    process.stderr.on('data', (data) => {
        console.warn(data.toString());
    });
    process.on('error', (err) => {
        console.error('Failed to start subprocess.', err);
    });
    return process;
    /*return fork("tests/testServer.ts", {
        execArgv: ["yarn"],
        env: env
    })*/
}
