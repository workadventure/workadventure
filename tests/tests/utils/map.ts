import type { Page } from "@playwright/test";
import { evaluateScript } from "./scripting";
import { RENDERER_MODE } from "./environment";
import { play_url } from "./urls";
import { clickCoordinates } from "./gameCoordinates";

class Map {
    async walkTo(page: Page, key: string, delay = 0) {
        await page.keyboard.press(key, { delay });
    }

    async rightClickToPosition(page: Page, x: number, y: number, delay = 0) {
        await clickCoordinates(page, { x, y }, { delay, button: "right" });
    }

    async walkToPosition(page: Page, x: number, y: number) {
        await evaluateScript(
            page,
            async ({ x, y }) => {
                await WA.player.moveTo(x, y);
                return;
            },
            {
                x,
                y,
            },
        );
    }

    async teleportToPosition(page: Page, x: number, y: number) {
        await evaluateScript(
            page,
            async ({ x, y }) => {
                await WA.player.teleport(x, y);
                return;
            },
            {
                x,
                y,
            },
        );
    }

    async goToRoom(page: Page, room: string) {
        await evaluateScript(
            page,
            async ({ room }) => {
                WA.nav.goToRoom(room);
            },
            {
                room,
            },
        );
    }

    /**
     * Starts a pathfinding walk without awaiting its completion (a slow `speed` makes mid-walk
     * scenarios deterministic). Retrieve the outcome later with waitForMoveToResult().
     */
    async startMoveTo(page: Page, x: number, y: number, speed?: number) {
        await evaluateScript(
            page,
            async ({ x, y, speed }) => {
                await WA.onInit();
                const w = window as unknown as {
                    moveToResult?: Promise<{ x: number; y: number; cancelled: boolean }>;
                };
                w.moveToResult = WA.player.moveTo(x, y, speed);
            },
            {
                x,
                y,
                speed,
            },
        );
    }

    async waitForMoveToResult(page: Page): Promise<{ x: number; y: number; cancelled: boolean }> {
        return await evaluateScript(page, async () => {
            const w = window as unknown as {
                moveToResult?: Promise<{ x: number; y: number; cancelled: boolean }>;
            };
            if (w.moveToResult === undefined) {
                throw new Error("No moveTo was started with startMoveTo()");
            }
            return await w.moveToResult;
        });
    }

    async getPosition(page: Page): Promise<{ x: number; y: number }> {
        return await evaluateScript(page, async () => {
            await WA.onInit();
            return await WA.player.getPosition();
        });
    }

    url(end: string) {
        return `${play_url}/~/maps/${end}.wam?phaserMode=${RENDERER_MODE}`;
    }
}

export default new Map();
