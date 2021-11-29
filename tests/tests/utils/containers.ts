//import Docker from "dockerode";
//import * as Dockerode from "dockerode";
import Dockerode = require( 'dockerode')


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
    const container = await findContainer('back');
    await stopContainer(container);
    await startContainer(container);
}

export async function rebootPusher(): Promise<void> {
    const container = await findContainer('pusher');
    await stopContainer(container);
    await startContainer(container);
}

export async function rebootRedis(): Promise<void> {
    const container = await findContainer('redis');
    await stopContainer(container);
    await startContainer(container);
}
