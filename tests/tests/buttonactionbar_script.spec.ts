import {expect, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';

test.describe('Button in action bar', () => {
    test('test', async ({ browser }, { project }) => {
        // Skip test for mobile device
        if(project.name === "mobilechromium") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
        
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
    test('test', async ({ browser }, { project }) => {
        // Skip test for mobile device
        if(project.name === "mobilechromium") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
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
         */
        // Click on the register button
        await page.locator('#register-btn').click();

        // Check if the register button is hidden
        await expect(page.locator('#register-btn')).toHaveCount(0);
        await page.close();
        await page.context().close();
    });
});
