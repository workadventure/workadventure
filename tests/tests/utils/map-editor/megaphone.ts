import { expect, Page } from "@playwright/test";

class Megaphone {
  async toggleMegaphone(page: Page) {
    /*await page
      .locator('.map-editor .configure-my-room input[type="checkbox"]')
      .check();
       await page.locator(".input-switch").click();*/
   

    await page.locator('[data-testid="megaphone-switch"]').click();

    
  }

  async isMegaphoneEnabled(page: Page) {
    await page
      // .locator('.map-editor .configure-my-room input[type="checkbox"]')
      .locator('[data-testid="megaphone-switch"]')
      .isChecked();
  }

  async megaphoneInputNameSpace(page: Page, name = "MySpace") {
    await page.getByPlaceholder("MySpace").focus();
    await page.getByPlaceholder("MySpace").click();
    if (name === "") {
      const count = (await page.getByPlaceholder("MySpace").inputValue())
        .length;
      for (let i = 0; i < count; i++) {
        await page.getByPlaceholder("MySpace").press("Backspace");
      }
    } else {
      await page.getByPlaceholder("MySpace").fill(name);
    }
  }

  async megaphoneSelectScope(page: Page) {
  
    await page.getByLabel('Scope').selectOption('ROOM');
  }

  async megaphoneAddNewRights(page: Page, tag = "test") {

   
   await expect(page.getByRole('textbox', { name: 'Rights' })).toBeVisible();
   await page.getByRole('textbox', { name: 'Rights' }).fill(tag.toLowerCase());
   await page.getByRole('textbox', { name: 'Rights' }).press('Enter');
  
  }

  async megaphoneRemoveRights(page: Page, tag = "test") {
    
    await expect(page.locator('.indicators > button')).toBeVisible();
    await page.locator('.indicators > button').click();
  }

  async megaphoneSave(page: Page) {
    await page.getByRole("button", { name: "Save" }).click();
  }

  async isCorrectlySaved(page: Page) {
    await expect(page.getByRole('button', { name: 'Megaphone settings saved' })).toBeVisible();
  
  }

  async isNotCorrectlySaved(page: Page) {
    await expect(page.getByRole('button', { name: 'Error while saving megaphone settings' })).toBeVisible();
  }
}

export default new Megaphone();
