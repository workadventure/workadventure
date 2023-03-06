import { Page } from '@playwright/test';
import Dockerode from 'dockerode';
import { execSync } from 'child_process';

/**
 * Execute Docker compose, passing the correct host directory
 */
export function dockerCompose(command: string): void {
    let param = '';
    const overrideDockerCompose = process.env.OVERRIDE_DOCKER_COMPOSE;

    if (overrideDockerCompose) {
        param += ' -f '+overrideDockerCompose;
    }

    /*const stdout =*/ execSync('docker-compose -f docker-compose.yaml -f docker-compose-oidc.yaml '+param+' '+command, {
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

export async function rebootPlay(): Promise<void> {
    dockerCompose('up --force-recreate -d play');
}

export async function gotoWait200(page: Page, url: string): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const response = await page.goto(url);
        // Because we just rebooted play, we might get HTTP 502 errors from Traefik.
        // Let's wait for a correct answer.
        if (response.ok()) {
            break;
        }
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1_000);
    }
}

export async function stopPlay(): Promise<void> {
    dockerCompose('stop play');
}

export async function stopEjabberd(): Promise<void> {
    dockerCompose('stop ejabberd');
}

export async function rebootEjabberd(): Promise<void> {
    dockerCompose('up --force-recreate -d ejabberd');
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
