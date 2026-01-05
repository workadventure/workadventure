import { test, expect } from "@playwright/test";
import { getPage } from "./utils/auth";
import { publicTestMapUrl } from "./utils/urls";
import menu from "./utils/menu";

test.describe("Report issue", () => {
    test("Should display the report issue button @local", async ({ browser }) => {
        // Create two browser contexts for Alice and Bob
        await using alicePage = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "report_issue")
        );
        await menu.openMenu(alicePage);
        await expect(alicePage.getByRole('button', { name: 'Report an issue' })).toBeVisible();

        // Click on the report issue button
        await alicePage.getByRole('button', { name: 'Report an issue' }).click();
        await expect(alicePage.getByRole('button', { name: 'Send Bug Report' })).toBeVisible();
        
        await alicePage.context().close();
    });
});
