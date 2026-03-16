import { spawn } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const tsxCliPath = require.resolve("tsx/cli");

export default function(env: {}) {
    const testServer = spawn(process.execPath, [tsxCliPath, "tests/testServer.ts"], {
        env: {
            ...process.env,
            ...env,
        },
        cwd: __dirname + "/..",
    });

    /*process.stdout.on('data', (data) => {
        console.log(data.toString());
    });*/
    testServer.stderr.on('data', (data) => {
        console.warn('TestServer logs:', data.toString());
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
