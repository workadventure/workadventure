import { expect, test } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

test.describe("GPU tile layer demotion @nowebkit", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(isMobile(page), "Skip on mobile devices");
    });

    test("setTiles demotes a GPU layer and renders tiles from another tileset", async ({ browser }) => {
        // The "setTiles" layer of this map only uses tiles from the "Floor" tileset,
        // so it is rendered with a TilemapGPULayer. The first setTiles call must demote
        // it to a classic CPU layer, which can then display tiles from any tileset.
        await using page = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/Metadata/setTilesGpuDemotion.json", "gpu_tile_layer"),
        );

        const consoleTexts: string[] = [];
        const pageErrors: string[] = [];
        page.on("console", (msg) => consoleTexts.push(msg.text()));
        page.on("pageerror", (err) => pageErrors.push(err.message));

        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.room.setTiles([
                // Named tile from the Floor tileset (the layer's own tileset)
                { x: 2, y: 2, tile: "Red", layer: "setTiles" },
                // Cross-tileset tiles: gids 33 and 34 belong to the TDungeon tileset
                { x: 3, y: 2, tile: 33, layer: "setTiles" },
                { x: 4, y: 2, tile: 34, layer: "setTiles" },
                { x: 5, y: 2, tile: "blue", layer: "setTiles" },
            ]);
        });

        await expect
            .poll(() => consoleTexts.some((t) => t.includes('Tile layer "setTiles" was modified by a script')), {
                timeout: 15000,
            })
            .toBe(true);

        // Let a few frames render to make sure nothing blew up
        // (e.g. a stale player collider still pointing to the destroyed GPU layer).
        await page.evaluate(
            () =>
                new Promise((resolve) => {
                    let frames = 0;
                    const step = () => (++frames >= 30 ? resolve(undefined) : requestAnimationFrame(step));
                    requestAnimationFrame(step);
                }),
        );
        expect(pageErrors).toEqual([]);
    });
});
