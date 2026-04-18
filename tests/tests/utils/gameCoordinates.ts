import type { Page } from "@playwright/test";

export interface Coordinates {
    x: number;
    y: number;
}

export type CoordinateSpace = "game" | "browser";

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
