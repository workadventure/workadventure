import { expect, test } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import Menu from "./utils/menu";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";

test.describe("WA.player.setStatus() @nowebkit", () => {
    test.beforeEach(({ browserName }) => {
        test.skip(browserName === "webkit", "WebKit limitations");
    });

    test("should change player status via scripting API", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "test-setstatus"));

        // Test BUSY
        await evaluateScript(page, () => WA.player.setStatus("BUSY"));
        await Menu.openMenu(page);
        await expect(page.getByRole("button", { name: "Busy" }).locator("svg")).toBeVisible();
        await Menu.closeMenu(page);

        // Test DO_NOT_DISTURB
        await evaluateScript(page, () => WA.player.setStatus("DO_NOT_DISTURB"));
        await Menu.openMenu(page);
        await expect(page.getByRole("button", { name: "Do not disturb" }).locator("svg")).toBeVisible();
        await Menu.closeMenu(page);

        // Test reset to ONLINE
        await evaluateScript(page, () => WA.player.setStatus("ONLINE"));
        await Menu.openMenu(page);
        await expect(page.getByRole("button", { name: "Online" }).locator("svg")).toBeVisible();

        await page.context().close();
    });

    test("should reject SILENT status (auto-managed)", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "test-setstatus"));

        await evaluateScript(page, () => WA.player.setStatus("SILENT"));

        await Menu.openMenu(page);
        await expect(page.getByRole("button", { name: "Online" }).locator("svg")).toBeVisible();

        await page.context().close();
    });
});
