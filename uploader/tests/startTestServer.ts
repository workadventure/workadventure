import {spawn} from "child_process";

export default function(env: {}) {
    const testServer = spawn("npm", ['run', 'startTestServer'], {
        env: {
            ...process.env,
            ...env
        },
        cwd: new URL("../", import.meta.url),
    });
    let stderr = "";

    /*process.stdout.on('data', (data) => {
        console.log(data.toString());
    });*/
    testServer.stderr.on('data', (data) => {
        stderr += data.toString();
    });
    testServer.on('exit', (code, signal) => {
        if ((code ?? 0) !== 0 && signal !== "SIGKILL" && stderr.length > 0) {
            console.warn('TestServer logs:', stderr);
        }
    });
    testServer.on('error', (err) => {
        console.error('Failed to start subprocess.', err);
    });
    return testServer;
    /*return fork("tests/testServer.ts", {
        execArgv: ["yarn"],
        env: env
    })*/
}
