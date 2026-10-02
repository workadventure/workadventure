import type { ChildProcessWithoutNullStreams } from "child_process";
import { fileURLToPath } from "url";
import {spawn} from "child_process";

export default function(env: Record<string, string | number>) {
    const testServer: ChildProcessWithoutNullStreams = spawn("npm", ['run', 'startTestServer'], {
        env: {
            ...process.env,
            ...env
        },
        cwd: fileURLToPath(new URL("../", import.meta.url)),
        // Own process group: "npm run" spawns the server through a shell, and killing the shell
        // alone leaves the server behind, holding the port for every subsequent run.
        detached: true,
    });
    let stderr = "";

    /*process.stdout.on('data', (data) => {
        console.log(data.toString());
    });*/
    testServer.stderr.on('data', (data: Buffer) => {
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
}

/**
 * Kills the test server and everything it spawned, and waits for it to be gone.
 */
export async function stopTestServer(testServer: ChildProcessWithoutNullStreams | undefined): Promise<void> {
    if (!testServer?.pid) {
        return;
    }

    const exited = new Promise((resolve) => {
        testServer.on("exit", () => resolve(0));
    });

    try {
        process.kill(-testServer.pid, "SIGKILL");
    } catch {
        // The process group is already gone.
        return;
    }

    await exited;
}
