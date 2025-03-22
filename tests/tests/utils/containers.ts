import { execSync } from "child_process";
import {APIRequestContext, APIResponse } from "@playwright/test";
import Dockerode from "dockerode";
import { play_url } from "./urls";

/**
 * Execute Docker compose, passing the correct host directory
 */
export function dockerCompose(command: string) {
  let param = "";
  const overrideDockerCompose = process.env.OVERRIDE_DOCKER_COMPOSE;

  if (overrideDockerCompose) {
    param += " -f " + overrideDockerCompose;
  }

  return execSync(
    "docker compose -f docker-compose.yaml -f docker-compose-oidc.yaml " +
      param +
      " " +
      command,
    {
      cwd: __dirname + "/../../../",
    }
  );
}

/**
 * Returns a container ID based on the container name.
 */
export async function findContainer(
  name: string
): Promise<Dockerode.ContainerInfo> {
  const docker = new Dockerode();

  const containers = await docker.listContainers();

  const foundContainer = containers.find(
    (container) =>
      container.State === "running" &&
      container.Names.find((containerName) => containerName.includes(name))
  );

  if (foundContainer === undefined) {
    throw new Error(
      'Could not find a running container whose name contains "' + name + '"'
    );
  }

  return foundContainer;
}

export async function stopContainer(
  container: Dockerode.ContainerInfo
): Promise<void> {
  const docker = new Dockerode();

  await docker.getContainer(container.Id).stop();
}

export async function startContainer(
  container: Dockerode.ContainerInfo
): Promise<void> {
  const docker = new Dockerode();

  await docker.getContainer(container.Id).start();
}

export async function rebootBack(): Promise<void> {
  dockerCompose("up --force-recreate -d back");
}

export function rebootTraefik(): void {
  dockerCompose("up --force-recreate -d reverse-proxy");
}

export function stopTraefik(): void {
  dockerCompose("stop reverse-proxy");
}

export function startTraefik(): void {
  dockerCompose("start reverse-proxy");
}

export async function rebootPlay(request: APIRequestContext): Promise<void> {
  dockerCompose("up --force-recreate -d play");
  let response: APIResponse;
  do {
    // wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const targetUrl = new URL("ping", play_url).toString();
    response = await request.get(targetUrl);
  } while(!response.ok())
}

export async function upPlay(): Promise<void> {
  dockerCompose("up -d play");
}

export async function upMapStorage(): Promise<void> {
  dockerCompose("up -d map-storage");
}

/*export async function gotoWait200(page: Page, url: string): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const targetUrl = new URL(url, play_url).toString();
    const response = await page.goto(targetUrl);
    // Because we just rebooted play, we might get HTTP 502 errors from Traefik.
    // Let's wait for a correct answer.
    if (response.ok()) {
      break;
    }
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1_000);
  }
}*/

export async function stopPlay(): Promise<void> {
  dockerCompose("stop play");
}

/*export async function stopEjabberd(): Promise<void> {
  dockerCompose("stop ejabberd");
}

export async function rebootEjabberd(): Promise<void> {
  dockerCompose("up --force-recreate -d ejabberd");
}*/

export async function resetRedis(): Promise<void> {
  dockerCompose("stop redis");
  dockerCompose("rm -f redis");
  dockerCompose("up --force-recreate -d redis");
}

export function stopRedis(): void {
  dockerCompose("stop redis");
}

export function startRedis(): void {
  dockerCompose("start redis");
}

// create function to check that "play", "back", "chat", "map-storage" services are up and running
export function checkMapStorageService(): boolean {
  console.log(
    "Checking map storage services",
    dockerCompose("logs --tail=1000 map-storage").toString()
  );
  const isUp =
    dockerCompose("logs --tail=1000 map-storage").indexOf(
      "Application is running"
    ) !== -1;
  if (!isUp) upMapStorage();
  return (
    dockerCompose("logs --tail=1000 map-storage").indexOf(
      "Application is running"
    ) !== -1
  );
}

// create function to check that "play", "back", "chat", "map-storage" services are up and running
export function checkMapPlayService(): boolean {
  console.log(
    "Checking play services",
    dockerCompose("logs --tail=1000 play").toString()
  );
  const isUp =
    dockerCompose("logs --tail=1000 play").indexOf(
      "WorkAdventure Pusher started on port"
    ) !== -1 &&
    dockerCompose("logs --tail=1000 play").indexOf(
      "RoomAPI starting on port"
    ) !== -1;
  if (!isUp) upPlay();
  return isUp;
}
