import {expect, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';
import {isMobile} from "./utils/isMobile";

test.describe('Button in action bar', () => {
    test.beforeEach(async ({ page }) => {
        if (isMobile(page)) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });
    test('test', async ({ browser }) => {
        
        const page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "buttonactionbar_script")
        );
        // Use script to add new button
        await evaluateScript(page, async () => {
            return WA.ui.actionBar.addButton({
                id: 'register-btn',
                label: 'Register',
                callback: () => {
                    WA.ui.actionBar.removeButton('register-btn');
                }
            });
        });
        // Click on the register button
        await page.getByText('Register').click();
        // Check if the register button is hidden
        await expect(page.getByText('Register')).toHaveCount(0);
        await page.close();
        await page.context().close();
    });
});

test.describe('Action button in action bar', () => {
    test.beforeEach(async ({ page }) => {
        if (isMobile(page)) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });
    test('test', async ({ browser }) => {
        const page = await getPage(browser, 'Alice', 
            publicTestMapUrl("tests/E2E/empty.json", "buttonactionbar_script")
        );
        // Use script to add new button
        await evaluateScript(page, async () => {
            return WA.ui.actionBar.addButton({
                id: 'register-btn',
                type: 'action',
                toolTip: 'Register',
                imageSrc: '/src/front/Components/images/icon-workadventure-white.png',
                callback: () => {
                    WA.ui.actionBar.removeButton('register-btn');
                }
            });
        });
        /**
         *  TODO apply this when API scripting will released
         **/
        // Click on the register button
        await page.getByRole('button', { name: 'Register' }).click();
        // Check if the register button is hidden
        await expect(page.getByRole('button', { name: 'Register' })).toHaveCount(0);
        await page.close();
        await page.context().close();
    });
});
