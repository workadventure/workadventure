import { expect, test } from '@playwright/test';
import { RENDERER_MODE } from './utils/environment';
import { publicTestMapUrl } from './utils/urls';
import { isMobile } from './utils/isMobile';

test.describe('Browser Not Supported Page', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(isMobile(page), 'Skip on mobile devices');
    });

    test('should display browser not supported page when structuredClone is not available', async ({
        page, browserName
    }) => {
        // Remove structuredClone before page loads to simulate unsupported browser
        await page.addInitScript(() => {
            // Save original if it exists (for cleanup)
            if (typeof window.structuredClone === 'function') {
                (window as unknown as { _originalStructuredClone: typeof window.structuredClone })._originalStructuredClone = window.structuredClone;
            }
            // Delete structuredClone to simulate unsupported browser
            delete (window as unknown as { structuredClone: typeof window.structuredClone }).structuredClone;
        });

        // Navigate to a WorkAdventure map
        await page.goto(
            publicTestMapUrl('tests/E2E/empty.json', 'browser_not_supported', RENDERER_MODE)
        );

        // Wait for the browser not supported page to appear
        // The page should appear instead of the normal login flow
        await expect(page.getByText(/Browser Not Supported/)).toBeVisible({
            timeout: 10000,
        });

        // Verify the main title is displayed (with emoji)
        await expect(page.locator('h2:has-text("Browser Not Supported")')).toBeVisible();
        // Verify emoji is present in title
        await expect(page.locator('h2')).toContainText('😢');

        // Verify the message contains browser name (should detect Chrome in tests)
        const message = page.getByText(/Your browser/).first();
        await expect(message).toBeVisible();

        // Verify the description is displayed
        await expect(
            page.getByText(/Your browser is too old to run WorkAdventure/)
        ).toBeVisible();

        // Verify "What can you do?" section is displayed
        await expect(page.getByText('What can you do?')).toBeVisible();

        // Verify the options are displayed
        await expect(
            page.getByText(/Update.*to the latest version/, { exact: false })
        ).toBeVisible();
        await expect(
            page.getByText(/Leave WorkAdventure and use a different browser/)
        ).toBeVisible();

        // Verify both buttons are present and visible
        const updateButton = page.getByTestId('update-browser-button');
        const leaveButton = page.getByTestId('leave-button');

        await expect(updateButton).toBeVisible();
        await expect(leaveButton).toBeVisible();

        // Verify button texts
        await expect(updateButton).toContainText('Update Browser');
        await expect(leaveButton).toContainText('Leave');

        // Verify the normal application does NOT load
        // The login scene should not appear
        await expect(page.getByTestId('loginSceneNameInput')).not.toBeVisible({
            timeout: 5000,
        });

        // Verify the game container is not visible
        await expect(page.locator('#game')).toBeHidden();
    });
});
