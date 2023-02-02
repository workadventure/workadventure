import {dockerClient} from "testcontainers/dist/docker/docker-client";
import {pullImage} from "testcontainers/dist/docker/functions/image/pull-image";
import {getAuthConfig} from "testcontainers/dist/registry-auth-locator";
import {DockerImageName} from "testcontainers/dist/docker-image-name";

export default async function () {
    console.log("Pulling required images")
    await pull("localstack/localstack:1.3.1");
    await pull("redis:6");
}

async function pull(image: string) {
    console.log(`Pulling ${image}... start`)
    const imageName = DockerImageName.fromString(image)
    await pullImage((await dockerClient()).dockerode, {
        imageName: imageName,
        force: false,
        authConfig: await getAuthConfig(imageName.registry),
    });
    console.log(`Pulling ${image}... complete`)
}
