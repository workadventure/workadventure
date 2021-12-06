//import Docker from "dockerode";
//import * as Dockerode from "dockerode";
import Dockerode = require( 'dockerode')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { execSync } = require('child_process');
const path = require("path");
const fs = require('fs');

/**
 * Execute Docker compose, passing the correct host directory (in case this is run from the TestCafe container)
 */
export function dockerCompose(command: string): void {
    let param = '';
    const projectDir = process.env.PROJECT_DIR;

    if (!projectDir && fs.existsSync('/project')) {
        // We are probably in the docker-image AND we did not pass PROJECT_DIR env variable
        throw new Error('Incorrect docker-compose command used to fire testcafe tests. You need to add a PROJECT_DIR environment variable. Please refer to the CONTRIBUTING.md guide');
    }

    if (projectDir) {
        const dirName = path.basename(projectDir);
        param = '--project-name '+dirName+' --project-directory '+projectDir;
    }

    let stdout = execSync('docker-compose '+param+' '+command, {
        cwd: __dirname + '/../../../'
    });
}

/**
 * Returns a container ID based on the container name.
 */
export async function findContainer(name: string): Promise<Dockerode.ContainerInfo> {
    const docker = new Dockerode();

    const containers = await docker.listContainers();

    const foundContainer = containers.find((container) => container.State === 'running' && container.Names.find((containerName) => containerName.includes(name)));

    if (foundContainer === undefined) {
        throw new Error('Could not find a running container whose name contains "'+name+'"');
    }

    return foundContainer;
}

export async function stopContainer(container: Dockerode.ContainerInfo): Promise<void> {
    const docker = new Dockerode();

    await docker.getContainer(container.Id).stop();
}

export async function startContainer(container: Dockerode.ContainerInfo): Promise<void> {
    const docker = new Dockerode();

    await docker.getContainer(container.Id).start();
}

export async function rebootBack(): Promise<void> {
    dockerCompose('up --force-recreate -d back');
}

export function rebootTraefik(): void {
    dockerCompose('up --force-recreate -d reverse-proxy');
}

export async function rebootPusher(): Promise<void> {
    dockerCompose('up --force-recreate -d pusher');
}

export async function resetRedis(): Promise<void> {
    dockerCompose('stop redis');
    dockerCompose('rm -f redis');
    dockerCompose('up --force-recreate -d redis');
}

export function stopRedis(): void {
    dockerCompose('stop redis');
}

export function startRedis(): void {
    dockerCompose('start redis');
}
