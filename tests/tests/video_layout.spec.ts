import {expect, Page, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';

async function startVideo(page: Page) {
    await evaluateScript(page, async () => {
        await WA.ui.playVideo("https://dl11.webmfiles.org/big-buck-bunny_trailer-.webm", { name:"Bob" });
    });
}

test.describe('Video layout tests', () => {
    test('that the number of video displayed is limited @local @nowebkit', async ({ browser}, { project }) => {
        await using page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_start_video"));

        // Let's start 7 videos.
        // The limit is set to 6 in the environment variables of the Playwright tests.
        await startVideo(page);
        await startVideo(page);
        await startVideo(page);
        await startVideo(page);
        await startVideo(page);
        await startVideo(page);
        await startVideo(page);

        // Wait for video container to go in vertical mode
        await expect(page.getByTestId('resize-handle')).toBeVisible();

        // Let's assert that only 6 are visible.
        await expect(page.getByText('Bob').nth(0)).toBeVisible();
        await expect(page.getByText('Bob').nth(1)).toBeVisible();
        await expect(page.getByText('Bob').nth(2)).toBeVisible();
        await expect(page.getByText('Bob').nth(3)).toBeVisible();
        await expect(page.getByText('Bob').nth(4)).toBeVisible();
        await expect(page.getByText('Bob').nth(5)).toBeVisible();

        // We cannot check if the 7th Bob is hidden because even if it is out of the scrollBox, it is still considered visible by Playwright.
        // await expect(page.getByText('Bob').nth(6)).toBeHidden(); => returns false
        // So instead, we will compare the y coordinates of the 7th video with the coordinates of the resize handle.
        const video7Y = await page.getByText('Bob').nth(6).boundingBox().then(box => box?.y ?? 0);
        const resizeHandleY = await page.getByTestId('resize-handle').boundingBox().then(box => box?.y ?? 0);
        expect(video7Y).toBeGreaterThan(resizeHandleY);
    });
});
