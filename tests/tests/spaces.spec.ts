import { expect, test } from "@playwright/test";
import { publicTestMapUrl } from "./utils/urls.ts";
import { getPage } from "./utils/auth.ts";
import { isMobile } from "./utils/isMobile.ts";
import { getBackDump, getPusherDump } from "./utils/debug.ts";
import { rebootBack } from "./utils/containers.ts";

test.setTimeout(180_000);
test.describe("Spaces @nomobile @nowebkit", () => {
    test.beforeEach(async ({ page, browserName }) => {
        test.skip(isMobile(page) || browserName === "webkit", "Skip on mobile and WebKit, this is a mostly back test");
    });
    test("purges spaces if back restarts @docker @slow", async ({ browser, request }) => {
        await using page = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "spaces"));

        await expect.poll(() => getBackDump()).toContain("Alice");
        await expect.poll(() => getPusherDump()).toContain("Alice");

        await page.close();
        await page.context().close();

        // Wait for the user to be removed from the spaces
        await expect.poll(() => getBackDump(), { timeout: 60_000 }).not.toContain("Alice");
        await expect.poll(() => getPusherDump(), { timeout: 60_000 }).not.toContain("Alice");

        // Let's reopen the page
        await using page2 = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "spaces"));

        await expect.poll(() => getBackDump()).toContain("Alice");
        await expect.poll(() => getPusherDump()).toContain("Alice");

        // Now, restart the back
        await rebootBack();

        await expect(page2.getByText("Connecting")).toBeVisible();

        // Wait for the user to be removed from the spaces
        await expect.poll(() => getPusherDump(), { timeout: 10_000 }).not.toContain("Alice");
        //await expect(getBackDump()).not.toContain("Alice");

        await page2.context().close();
    });
});
