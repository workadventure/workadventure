import {expect, test} from "@playwright/test";
import {getPage} from "./utils/auth";
import {publicTestMapUrl} from "./utils/urls";
import {isMobile} from "./utils/isMobile";

test.describe('Picture In Picture', () => {
    test('available on chrome', async ({ page, browser, browserName }) => {
        test.skip(
            isMobile(page) || browserName !== "chromium",
            "Skip on mobile and no WebKit due to limitations"
        );

        await using alicePage = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "picture_in_picture")
        );

        await using bobPage = await getPage(browser, 'Bob',
            publicTestMapUrl("tests/E2E/empty.json", "picture_in_picture")
        );

        // Wait for both users to be connected
        await expect(alicePage.getByText("Bob", { exact: true })).toBeVisible({ timeout: 20_000 });
        await expect(bobPage.getByText("Alice", { exact: true })).toBeVisible({ timeout: 20_000 });

        // Move to a position where the video call button is visible
        await alicePage.mouse.move(300, 300);
        await bobPage.mouse.move(300, 300);

        // Wait for the video call button to be visible
        await expect(bobPage.getByTestId('pictureInPictureButton')).toBeVisible({ timeout: 10_000 });
        const page2Promise = bobPage.waitForEvent('popup');
        await bobPage.getByTestId('pictureInPictureButton').click();
        const page2 = await page2Promise;
        await expect(page2.getByText('Alice')).toBeVisible();
        await expect(page2.getByText('You')).toBeVisible();

        await alicePage.close();
        await bobPage.close();
    });

    test('not available', async ({ page, browser, browserName }) => {
        test.skip(
            isMobile(page) || browserName === "chromium",
            "Skip on mobile and no WebKit or Firefox due to limitations"
        );

        await using alicePage = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "picture_in_picture")
        );

        await using bobPage = await getPage(browser, 'Bob',
            publicTestMapUrl("tests/E2E/empty.json", "picture_in_picture")
        );

        // Wait for both users to be connected
        await expect(alicePage.getByText("Bob", { exact: true })).toBeVisible({ timeout: 20_000 });
        await expect(bobPage.getByText("Alice", { exact: true })).toBeVisible({ timeout: 20_000 });

        // Move to a position where the video call button is visible
        await alicePage.mouse.move(300, 300);
        await bobPage.mouse.move(300, 300);

        // Wait for the video call button to be visible
        await expect(bobPage.getByTestId('pictureInPictureButtonDisabled')).toBeVisible({ timeout: 10_000 });
        await expect(alicePage.getByTestId('pictureInPictureButtonDisabled')).toBeVisible({ timeout: 10_000 });

        await alicePage.close();
        await bobPage.close();
    });

});
