import {Page} from "@playwright/test";

export async function selectMegaphoneItemInCMR(page: Page) {
    await page.locator('li:has-text("Megaphone")').click();
}

export async function toggleMegaphone(page: Page){
    await page.locator('.map-editor .modal input[type="checkbox"]').check();
}

export async function isMegaphoneEnabled(page: Page){
    await page.locator('.map-editor .modal input[type="checkbox"]').isChecked();
}

export async function megaphoneInputNameSpace(page: Page){
    await page.getByPlaceholder('MySpace').click();
    await page.getByPlaceholder('MySpace').fill('Test');
}

export async function megaphoneSelectScope(page: Page){
    await page.locator('.map-editor .modal select').first().selectOption('ROOM');
}
 export async function megaphoneAddNewRights(page: Page) {
     await page.getByPlaceholder('Select rights').fill('test');
     await page.getByText('Add new : TEST').click();
 }

 export async function megaphoneSave(page: Page) {
     await page.getByRole('button', { name: 'Save' }).click();
 }