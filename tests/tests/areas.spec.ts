import { expect, test } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import { publicTestMapUrl } from "./utils/urls";
import Menu from "./utils/menu";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Map from "./utils/map";

test.describe("Areas @nomobile", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(isMobile(page), "Skip on mobile devices");
    });

    test("can edit Tiled area from scripting API", async ({ browser }) => {
        // This tests connects on a map with an area named "silent".
        // The Woka is out of the zone, but we move the zone to cover the Woka.
        // We check the silent zone applies to the Woka.

        await using page = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/Areas/AreaFromTiledMap/map.json", "areas"),
        );

        await evaluateScript(page, async () => {
            await WA.onInit();

            const silentArea = await WA.room.area.get("silent");
            // Let's move the silent area to cover the map
            silentArea.x = 0;
            silentArea.y = 0;
            silentArea.width = 800;
            silentArea.height = 600;
            return;
        });

        await expect(page.getByText("Silent zone 🤐")).toBeVisible();

        await page.context().close();
    });

    test("blocking audio areas", async ({ browser }) => {
        // Open audio test map
        await using page = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/audio.json", "areas"));
        // Verify audio area is working
        await evaluateScript(page, async () => {
            console.log("Waiting for WA.onInit()");
            await WA.onInit();
            console.log("Moving player to audio area");
            await WA.player.teleport(240, 144);
            return;
        });

        // Check that the manager sound is active
        await Menu.expectButtonState(page, "music-button", "active");
        // Click on the soud manager button
        await page.getByTestId("music-button").click();
        // Check that the slider is hidden
        await expect(page.getByRole("slider")).toBeHidden();
        // Click on the soud manager button
        await page.getByTestId("music-button").click();
        // Check that the slider is visible
        await expect(page.getByRole("slider")).toBeVisible();

        // Enable audio area blocking
        await Menu.openMenu(page);
        await page.getByRole("button", { name: "All settings" }).click();
        await page.getByText("Block ambient sounds and music").click();
        await page.locator("#closeMenu").click();

        // Verify audio area is working
        await evaluateScript(page, async () => {
            console.log("Waiting for WA.onInit()");
            await WA.onInit();
            console.log("Moving player to audio area");
            await WA.player.teleport(176, 144);
            await WA.player.teleport(240, 144);
            return;
        });
        await Menu.expectButtonState(page, "music-button", "disabled");

        await page.context().close();
    });

    test("display warning on fail to load audio", async ({ browser }) => {
        // Open audio test map
        await using page = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/audio.json", "areas"));

        // Verify audio area is working
        await evaluateScript(page, async () => {
            console.log("Waiting for WA.onInit()");
            await WA.onInit();
            const silentArea = await WA.room.area.get("audioArea");
            silentArea.setProperty("playAudio", "invalid.mp3");
            console.log("Moving player to audio area");
            await WA.player.teleport(240, 144);
            return;
        });
        await Menu.expectButtonState(page, "music-button", "forbidden");
        await expect(page.getByText("Could not load sound")).toBeVisible();

        await page.context().close();
    });

    test("can create an area dynamically and detect when we enter and leave", async ({ browser }) => {
        await using page = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/E2E/empty.json", "availability-status"),
        );

        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.room.area.create({
                name: "MyNewArea",
                x: 0,
                y: 4 * 32,
                width: 64,
                height: 6 * 32,
            });

            WA.room.area.onEnter("MyNewArea").subscribe(() => {
                WA.ui.displayActionMessage({
                    message: "Welcome to MyNewArea",
                    type: "message",
                    callback: () => {
                        console.info("Welcome to MyNewArea");
                    },
                });
            });

            WA.room.area.onLeave("MyNewArea").subscribe(() => {
                WA.ui.displayActionMessage({
                    message: "Goodbye MyNewArea",
                    type: "message",
                    callback: () => {
                        console.info("Goodbye MyNewArea");
                    },
                });
            });
        });

        // Let's first check the onEnter is triggered when if we are already in the area when we subscribe.
        await expect(page.getByText("Welcome to MyNewArea")).toBeVisible();
        await page.getByRole("button", { name: "Close" }).first().click();
        // Let's move out
        await Map.teleportToPosition(page, 9 * 32, 9 * 32);
        await expect(page.getByText("Goodbye MyNewArea")).toBeVisible();
        await page.getByRole("button", { name: "Close" }).click();
        await expect(page.locator("span.characterTriggerAction")).toBeHidden();

        // Let's move back in
        await Map.teleportToPosition(page, 0.5 * 32, 5 * 32);
        await expect(page.getByText("Welcome to MyNewArea")).toBeVisible();

        await page.context().close();
    });
});
