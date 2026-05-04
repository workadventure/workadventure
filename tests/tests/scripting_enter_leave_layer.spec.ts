import { expect, test } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import Map from "./utils/map";
import { getPage } from "./utils/auth";
import { publicTestMapUrl } from "./utils/urls";

test.describe("Scripting for enter / leave layer event", () => {
    test("onEnterLayer / onLeaveLayer works", async ({ browser }) => {
        // Go to the empty map
        await using page = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "screensharing"));

        await evaluateScript(page, () => {
            WA.room.onEnterLayer("start").subscribe(() => {
                WA.ui.displayActionMessage({
                    message: "Welcome to start",
                    type: "message",
                    callback: () => {
                        console.info("Welcome to start");
                    },
                });
            });

            WA.room.onLeaveLayer("start").subscribe(() => {
                WA.ui.displayActionMessage({
                    message: "Goodbye start",
                    type: "message",
                    callback: () => {
                        console.info("Goodbye start");
                    },
                });
            });
        });

        // The subscription should automatically trigger on start because we are already in the start zone.
        await expect(page.getByText("Welcome to start")).toBeVisible();
        await page.getByRole("button", { name: "Close" }).first().click();

        await Map.teleportToPosition(page, 2 * 32, 8 * 32);

        await expect(page.getByText("Goodbye start")).toBeVisible();
        await page.getByRole("button", { name: "Close" }).first().click();

        // Let's go back to start
        await Map.teleportToPosition(page, 0.5 * 32, 4.5 * 32);

        await expect(page.getByText("Welcome to start")).toBeVisible();
        await page.getByRole("button", { name: "Close" }).first().click();

        // Let's subscribe to the "start" event again.
        // The subscribe should be fired again.
        await evaluateScript(page, () => {
            WA.room.onEnterLayer("start").subscribe(() => {
                WA.ui.displayActionMessage({
                    message: "Welcome back to start",
                    type: "message",
                    callback: () => {
                        console.info("Welcome back to start");
                    },
                });
            });
        });

        await expect(page.getByText("Welcome back to start")).toBeVisible();

        await page.context().close();
    });
});
