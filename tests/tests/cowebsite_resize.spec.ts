import { expect, test } from "@playwright/test";
import { maps_domain, play_url, publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { evaluateScript } from "./utils/scripting";

test.describe("Cowebsites resizing", () => {
    test("one can resize a cowebsite @nomobile", async ({ browser }) => {
        await using page = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/E2E/empty.json", "scripting_open_cowebsite"),
        );

        const url = new URL(`//${maps_domain}/tests/CoWebsite/page_with_input.html`, play_url).toString();

        await evaluateScript(
            page,
            async ({ url }) => {
                await WA.nav.openCoWebSite(url);
                return;
            },
            {
                url,
            },
        );

        // Let's test the resizing of the cowebsites by using the drag handler.
        // The iframes should correctly resize.
        const cowebsiteIframeBox = await page.locator('iframe[title="Cowebsite"]').first().boundingBox();
        expect(cowebsiteIframeBox).not.toBeNull();
        const widthBeforeResize = cowebsiteIframeBox?.width;

        const dragHandler = page.locator(".absolute.start-1");
        await dragHandler.hover();
        await page.mouse.down();
        await page.mouse.move(100, 100);
        await page.mouse.up();

        await expect
            .poll(async () => {
                const cowebsiteIframeBoxAfterResize = await page
                    .locator('iframe[title="Cowebsite"]')
                    .first()
                    .boundingBox();
                expect(cowebsiteIframeBoxAfterResize).not.toBeNull();
                const widthAfterResize = cowebsiteIframeBoxAfterResize?.width;
                return widthAfterResize;
            })
            .toBeGreaterThan(widthBeforeResize);
    });
});
