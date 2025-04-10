import {expect, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';
import {isMobile} from "./utils/isMobile";
import Menu from "./utils/menu";

test.describe('Action bar responsiveness', () => {
    test.beforeEach(async ({ page }) => {
        if (isMobile(page)) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });
    test('Check items in the action bar go in the menu one by one @oidc', async ({ browser }) => {
        
        const page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "responsive_actionbar")
        );
        // Use script to add new button
        await evaluateScript(page, async () => {
            WA.ui.actionBar.addButton({
                id: 'register-btn',
                label: 'Register',
                bgColor: '#4056F6',
                callback: () => {
                    WA.ui.actionBar.removeButton('register-btn');
                }
            });
            WA.ui.actionBar.addButton({
                id: 'download-btn',
                isGradient: true,
                label: 'Download',
                bgColor: '#eab127',

                callback: () => {
                    WA.ui.actionBar.removeButton('download-btn');
                }
            });
            WA.ui.actionBar.addButton({
                id: 'inventory-btn',
                label: 'Inventory',
                callback: () => {
                    WA.ui.actionBar.removeButton('inventory-btn');
                }
            });
        });

        await expect(page.getByText('Register')).toBeVisible();
        await expect(page.getByText('Download')).toBeVisible();
        await expect(page.getByText('Inventory')).toBeVisible();

        await page.setViewportSize({ width: 800, height: 600 });

        await expect(page.getByText('Register')).toBeHidden();
        await expect(page.getByText('Download')).toBeHidden();
        await expect(page.getByText('Inventory')).toBeVisible();

        await Menu.openMenu(page);

        await expect(page.getByTestId('profile-menu').getByText('Register')).toBeVisible();
        await expect(page.getByTestId('profile-menu').getByText('Download')).toBeVisible();

        await Menu.closeMenu(page);


        await expect(page.getByText('Invite')).toBeVisible();
        await expect(page.getByText('Login')).toBeVisible();

        await page.setViewportSize({ width: 345, height: 600 });

        await expect(page.getByText('Invite')).toBeHidden();
        await expect(page.getByText('Login')).toBeHidden();

        await Menu.openMenu(page);

        await expect(page.getByTestId('profile-menu').getByText('Invite')).toBeVisible();
        await expect(page.getByTestId('profile-menu').getByText('Login')).toBeVisible();


        await page.close();
        await page.context().close();
    });
});
