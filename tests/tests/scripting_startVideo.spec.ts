import {expect, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';

test.describe('Scripting WA.ui.playVideo functions', () => {
    test('can start and stop', async ({ browser}, { project }) => {
        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_start_video"));

        await evaluateScript(page, async () => {
            window.myVideo = await WA.ui.playVideo("https://2050today.org/wp-content/uploads/2020/07/Video-Placeholder.mp4?_=6", { name:"Bob" });
        });

        await expect(page.getByText('Bob')).toBeVisible();

        await evaluateScript(page, async () => {
            window.myVideo.stop();
        });

        await expect(page.getByText('Bob')).toBeHidden();
    });
});
