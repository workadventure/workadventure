import { expect, test } from '@playwright/test';
import {oidcLogin, oidcLogout} from "../utils/oidc";
import {evaluateScript} from "../utils/scripting";
import {publicTestMapUrl} from "../utils/urls";
import {getPage} from "../utils/auth";
import {isMobile} from "../utils/isMobile";
import Menu from "../utils/menu";

test.describe('OpenId connect @oidc mobile', () => {
    test.beforeEach(async ({ page, browserName }) => {
        // skip on firefox because the browser is too slow
        // (this is specific to mobile format make sur it work on a regular format)
        if (!isMobile(page) || browserName === "firefox") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
        }
    })
    test('Can login and logout', async ({ browser }, { project }) => {
        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "oidc"));

        await page.addLocatorHandler(page.getByText('Continue without webcam'), async () => {
            await page.getByText('Continue without webcam').click();
        });

        // Test if player variable is correct
        let isLogged = await evaluateScript(page, async () => {
            await WA.onInit();
            return WA.player.isLogged;
        });
        await expect(isLogged).toBe(false);

        // Login and Logout
        await Menu.openMenu(page);
        await oidcLogin(page);

        // Test  if player variable is correct
        isLogged = await evaluateScript(page, async () => {
            await WA.onInit();
            return WA.player.isLogged;
        });
        await expect(isLogged).toBe(true);

        // Logout User
        await oidcLogout(page);

        // Check user is Logout
        await Menu.openMenu(page);
        await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

        // Let's try to login using the scripting API
        await evaluateScript(page, async () => {
            await WA.onInit();
            await WA.nav.goToLogin();
        });
        await expect(page.locator('#Input_Username')).toBeVisible();
    });
});