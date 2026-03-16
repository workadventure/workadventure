import {spawnSync} from "child_process";

export function isDockerAvailable(): boolean {
    const result = spawnSync("docker", ["info"], {
        stdio: "ignore",
    });

    return result.status === 0;
}
