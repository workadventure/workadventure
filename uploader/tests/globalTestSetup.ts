import {isDockerAvailable} from "./utils/isDockerAvailable.ts";

export default async function () {
    if (!isDockerAvailable()) {
        console.warn("Skipping uploader container setup: no Docker client available.");
        return;
    }

    console.log("Pulling required images")
    await pull("localstack/localstack:1.3.1");
    await pull("redis:6");
}

async function pull(image: string) {
    const [{dockerClient}, {pullImage}, {getAuthConfig}, {DockerImageName}] = await Promise.all([
        import("testcontainers/dist/docker/docker-client"),
        import("testcontainers/dist/docker/functions/image/pull-image"),
        import("testcontainers/dist/registry-auth-locator"),
        import("testcontainers/dist/docker-image-name"),
    ]);

    console.log(`Pulling ${image}... start`)
    const imageName = DockerImageName.fromString(image)
    await pullImage((await dockerClient()).dockerode, {
        imageName: imageName,
        force: false,
        authConfig: await getAuthConfig(imageName.registry),
    });
    console.log(`Pulling ${image}... complete`)
}
