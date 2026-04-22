import type { Page } from "@playwright/test";

export interface Coordinates {
    x: number;
    y: number;
}

export type CoordinateSpace = "game" | "browser";

/**
 * Transform Phaser game coordinates to browser coordinates (where 0,0 is the top left corner of the browser viewport)
 */
export async function gameToBrowserCoordinates(page: Page, coordinates: Coordinates): Promise<Coordinates> {
    return page.evaluate((coordinates) => {
        const hooks = (
            window as unknown as {
                e2eHooks: {
                    gameToBrowserCoordinates(coordinates: Coordinates): Promise<Coordinates>;
                };
            }
        ).e2eHooks;

        return hooks.gameToBrowserCoordinates(coordinates);
    }, coordinates);
}

/**
 * Transform Phaser game coordinates to canvas coordinates (where 0,0 is the top left corner of the canvas), and
 * where pixels are browser pixels (useful to decide where to click on the canvas)
 */
export async function gameToBrowserCanvasCoordinates(page: Page, coordinates: Coordinates): Promise<Coordinates> {
    const browserCoordinates = await gameToBrowserCoordinates(page, coordinates);
    const canvasCoordinates = await page.locator("#game canvas").boundingBox();

    return {
        x: browserCoordinates.x - canvasCoordinates.x,
        y: browserCoordinates.y - canvasCoordinates.y,
    };
}

export async function coordinatesToBrowserCoordinates(
    page: Page,
    coordinates: Coordinates,
    coordinateSpace: CoordinateSpace = "game",
): Promise<Coordinates> {
    if (coordinateSpace === "browser") {
        return coordinates;
    }

    return gameToBrowserCoordinates(page, coordinates);
}

export async function moveMouseToCoordinates(
    page: Page,
    coordinates: Coordinates,
    coordinateSpace: CoordinateSpace = "game",
): Promise<Coordinates> {
    const browserCoordinates = await coordinatesToBrowserCoordinates(page, coordinates, coordinateSpace);
    await page.mouse.move(browserCoordinates.x, browserCoordinates.y);
    return browserCoordinates;
}

export async function clickCoordinates(
    page: Page,
    coordinates: Coordinates,
    options?: Parameters<Page["mouse"]["click"]>[2],
    coordinateSpace: CoordinateSpace = "game",
): Promise<Coordinates> {
    const browserCoordinates = await coordinatesToBrowserCoordinates(page, coordinates, coordinateSpace);
    await page.mouse.click(browserCoordinates.x, browserCoordinates.y, options);
    return browserCoordinates;
}
