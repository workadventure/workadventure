import {expect, Page} from "@playwright/test";

class Menu {
    async openChat(page: Page) {
        await page.click('button.chat-btn');
        await expect(page.locator('#chat.chatWindow')).toBeVisible();
    }

    async openMapEditor(page: Page) {
        await page.getByRole('button', {name: 'toggle-map-editor'}).click();
        await expect(await page.getByRole('button', {name: 'toggle-map-editor'}).first()).toHaveClass(/border-top-light/);
    }

    async openMenu(page: Page, isMobile: boolean) {
        if(isMobile){
            await expect(page.locator('button#burgerIcon')).toBeVisible();
            const mobileMenuVisible = await page.locator('button#burgerIcon img.tw-rotate-0').isVisible();
            if(mobileMenuVisible){
                await page.click('button#burgerIcon');
            }
        }
        await page.click('#menuIcon img:first-child');
        await expect(await page.locator('#menuIcon')).toHaveClass(/border-top-light/);
    }

    async closeMenu(page: Page) {
        await page.locator('.menu-container').getByRole('button', { name: '×' }).click();
        await expect(await page.locator('#menuIcon')).not.toHaveClass(/border-top-light/);
    }

    async closeMapEditor(page: Page) {
        await page.getByRole('button', {name: 'toggle-map-editor'}).click();
        await expect(await page.getByRole('button', {name: 'toggle-map-editor'}).first()).not.toHaveClass(/border-top-light/);
    }

    async toggleMegaphoneButton(page: Page) {
        await page.locator('.bottom-action-bar .bottom-action-button #megaphone').click({timeout: 5_000});
    }

    async isThereMegaphoneButton(page: Page) {
        await expect(await page.locator('.bottom-action-bar .bottom-action-button #megaphone')).toBeVisible({timeout: 30_000});
    }

    async isNotThereMegaphoneButton(page: Page) {
        await expect(await page.locator('.bottom-action-bar .bottom-action-button #megaphone')).toBeHidden({timeout: 30_000});
    }

    async openStatusList(page : Page, isMobile = false){
        if(isMobile){
            await expect(await page.locator('button#burgerIcon')).toBeVisible();
            const mobileMenuVisible = await page.locator('button#burgerIcon img.tw-rotate-0').isVisible();
            if(mobileMenuVisible){
                await page.click('button#burgerIcon');
            }
        }
        await page.click('#AvailabilityStatus');
    }

    async clickOnStatus(page:Page,status: string){
        await expect(page.getByText(status)).toBeVisible();
        await page.getByText(status).click();
        //eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(500);
    }

    async turnOnCamera(page:Page){
        if(await page.getByAltText('Turn off webcam').isVisible()) return;
        await page.getByAltText('Turn on webcam').click();
        await expect(page.getByAltText('Turn off webcam')).toBeVisible();
    }
    async turnOffCamera(page:Page){
        if(await page.getByAltText('Turn on webcam').isVisible()) return;
        await page.getByAltText('Turn off webcam').click();
        await expect(page.getByAltText('Turn on webcam')).toBeVisible();
    }
    async turnOnMicrophone(page:Page){
        if(await page.getByAltText('Turn off microphone').isVisible()) return;
        await page.getByAltText('Turn on microphone').click();
        await expect(page.getByAltText('Turn off microphone')).toBeVisible();
    }
    async turnOffMicrophone(page:Page){
        if(await page.getByAltText('Turn on microphone').isVisible()) return;
        await page.getByAltText('Turn off microphone').click();
        await expect(page.getByAltText('Turn on microphone')).toBeVisible();
    }

    async closeNotificationPopUp(page:Page){
        if(await page.getByRole('button',{name:'Continue without notification'}).isHidden())return;
        await page.getByRole('button',{name:'Continue without notification'}).click();
        await expect(page.getByRole('button',{name:'Continue without notification'})).toBeVisible();

    }
    async closeCameraPopUp(page:Page){
        if(await page.getByRole('button',{name:'Continue without webcam'}).isHidden())return;
        await page.getByRole('button',{name:'Continue without webcam'}).click();
        await expect(page.getByRole('button',{name:'Continue without webcam'})).toBeVisible();

    }

    async closeMapEditorConfigureMyRoomPopUp(page:Page){
        await page.locator('.configure-my-room button.close-window').click();
    }
}

export default new Menu();
