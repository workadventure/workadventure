import { expect, type Page } from "@playwright/test";

const DEFAULT_CAMERA_CONTAINER_TIMEOUT = 45_000;

async function getCamerasContainerText(page: Page): Promise<string> {
    const camerasContainer = page.locator("#cameras-container");
    if ((await camerasContainer.count()) === 0) {
        return "<#cameras-container not attached>";
    }

    return camerasContainer.innerText({ timeout: 1_000 }).catch(() => "<#cameras-container text unavailable>");
}

export async function expectCamerasContainerVisible(page: Page, timeout = DEFAULT_CAMERA_CONTAINER_TIMEOUT) {
    try {
        await expect(page.locator("#cameras-container")).toBeVisible({ timeout });
    } catch (error) {
        throw new Error(
            `Expected cameras container to be visible. Current cameras container text: ${await getCamerasContainerText(
                page,
            )}`,
            { cause: error },
        );
    }
}

export async function expectCameraParticipantVisible(
    page: Page,
    name: string,
    options: { exact?: boolean; timeout?: number } = {},
) {
    const { exact = true, timeout = DEFAULT_CAMERA_CONTAINER_TIMEOUT } = options;
    await expectCamerasContainerVisible(page, timeout);

    const participant = page.locator("#cameras-container").getByText(name, { exact }).first();

    try {
        await expect(participant).toBeVisible({ timeout });
    } catch (error) {
        throw new Error(
            `Expected "${name}" to be visible in cameras container. Current cameras container text: ${await getCamerasContainerText(
                page,
            )}`,
            { cause: error },
        );
    }
}

export async function expectCameraParticipantHidden(
    page: Page,
    name: string,
    options: { exact?: boolean; timeout?: number } = {},
) {
    const { exact = true, timeout = DEFAULT_CAMERA_CONTAINER_TIMEOUT } = options;
    const participant = page.locator("#cameras-container").getByText(name, { exact }).first();

    try {
        await expect(participant).toBeHidden({ timeout });
    } catch (error) {
        throw new Error(
            `Expected "${name}" to be hidden from cameras container. Current cameras container text: ${await getCamerasContainerText(
                page,
            )}`,
            { cause: error },
        );
    }
}
