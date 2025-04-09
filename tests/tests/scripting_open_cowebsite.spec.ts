import {expect, test} from '@playwright/test';
import {maps_domain, play_url, publicTestMapUrl} from "./utils/urls";
import { getPage} from "./utils/auth";
import {evaluateScript} from "./utils/scripting";
import {getCoWebsiteIframe} from "./utils/iframe";

test.describe('Scripting WA.nav.openCoWebsite function', () => {
    test('one can open several tabs that stay loaded', async ({ browser}) => {
        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_open_cowebsite"));

        const url = new URL(
            `//${maps_domain}/tests/CoWebsite/page_with_input.html`,
            play_url
        ).toString();

        await evaluateScript(page, async ({url}) => {
            await WA.nav.openCoWebSite(url);
            return;
        }, {
            url
        });

        await page.locator('iframe[title="Cowebsite"]').contentFrame().locator('[id="\\#text_input"]').click();
        await page.locator('iframe[title="Cowebsite"]').contentFrame().locator('[id="\\#text_input"]').fill('tab1');
        await page.locator('iframe[title="Cowebsite"]').contentFrame().locator('html').click();

        // Open a second tab
        await evaluateScript(page, async ({url}) => {
            await WA.nav.openCoWebSite(url);
            return;
        }, {
            url: url
        });

        // Check that the input field is empty
        await expect(getCoWebsiteIframe(page).locator('[id="\\#text_input"]')).toHaveValue('');
        await getCoWebsiteIframe(page).locator('[id="\\#text_input"]').fill('tab2');

        await page.getByTestId('tab1').click();
        await expect(getCoWebsiteIframe(page).locator('[id="\\#text_input"]')).toHaveValue('tab1');
        await expect(getCoWebsiteIframe(page).locator('[id="\\#text_input"]')).toBeVisible();
        await expect(page.locator('iframe[title="Cowebsite"]').nth(1)).toBeHidden();

        await page.getByTestId('tab2').click();
        await expect(getCoWebsiteIframe(page).locator('[id="\\#text_input"]')).toHaveValue('tab2');
        await expect(getCoWebsiteIframe(page).locator('[id="\\#text_input"]')).toBeVisible();

        await page.close();
        await page.context().close();
    });
});