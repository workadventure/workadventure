//import Docker from "dockerode";
//import * as Dockerode from "dockerode";
import Dockerode = require( 'dockerode')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { execSync } = require('child_process');

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
    let stdout = execSync('docker-compose up --force-recreate -d back', {
        cwd: __dirname + '/../../../'
    });
    /*const container = await findContainer('back');
    await stopContainer(container);
    await startContainer(container);*/
}

export function rebootTraefik(): void {
    let stdout = execSync('docker-compose up --force-recreate -d reverse-proxy', {
        cwd: __dirname + '/../../../'
    });

    //console.log('rebootTraefik', stdout);
}

export async function rebootPusher(): Promise<void> {
    let stdout = execSync('docker-compose up --force-recreate -d pusher', {
        cwd: __dirname + '/../../../'
    });
    /*const container = await findContainer('pusher');
    await stopContainer(container);
    await startContainer(container);*/
}

export async function resetRedis(): Promise<void> {
    let stdout = execSync('docker-compose stop redis', {
        cwd: __dirname + '/../../../'
    });
    //console.log('rebootRedis', stdout);

    stdout = execSync('docker-compose rm -f redis', {
        cwd: __dirname + '/../../../'
    });
    //console.log('rebootRedis', stdout);

    stdout = execSync('docker-compose up --force-recreate -d redis', {
        cwd: __dirname + '/../../../'
    });

    //console.log('rebootRedis', stdout);
/*
    let stdout = execSync('docker-compose stop redis', {
        cwd: __dirname + '/../../../'
    });
    console.log('stdout:', stdout);
    stdout = execSync('docker-compose rm redis', {
        cwd: __dirname + '/../../../'
    });
    //const { stdout, stderr } = await exec('docker-compose down redis');
    console.log('stdout:', stdout);
    //console.log('stderr:', stderr);
    const { stdout2, stderr2 } = await exec('docker-compose up -d redis');
    console.log('stdout:', stdout2);
    console.log('stderr:', stderr2);
*/
    /*const container = await findContainer('redis');
    //await stopContainer(container);
    //await startContainer(container);

    const docker = new Dockerode();
    await docker.getContainer(container.Id).stop();
    await docker.getContainer(container.Id).remove();
    const newContainer = await docker.createContainer(container);
    await newContainer.start();*/
}

export function stopRedis(): void {
    let stdout = execSync('docker-compose stop redis', {
        cwd: __dirname + '/../../../'
    });
}

export function startRedis(): void {
    let stdout = execSync('docker-compose start redis', {
        cwd: __dirname + '/../../../'
    });
}
