import { Page} from '@playwright/test';

export async function hideNoCamera(page: Page){
    await page.locator('form.helpCameraSettings button[type="submit"]').click();
}
