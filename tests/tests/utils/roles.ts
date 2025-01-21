
import {expect, Page} from '@playwright/test';

export async function login(
    page: Page,
    userName = 'Alice',
    characterNumber = 2,
    browserLanguage: string | null = 'en-US',
) {
  // window.localStorage.setItem('language', browserLanguage)

    await page.fill('input[name="loginSceneName"]', userName);
    await page.click('button.loginSceneFormSubmit');

    await expect(page.locator('button.selectCharacterSceneFormSubmit')).toBeVisible();

    for (let i = 0; i < characterNumber; i++) {
    await page.keyboard.press('ArrowRight');
    }

    await page.click('button.selectCharacterSceneFormSubmit');

  await selectMedias(page);
    }

async function selectMedias(page: Page) {
  
  await expect(page.locator('h2', { hasText: "Turn on your camera and microphone" })).toBeVisible();

  await page.click("text=Save");

  /*if(isMobile){
      await expect(await page.locator('button#burgerIcon')).toBeVisible();
      const mobileMenuVisible = await page.locator('button#burgerIcon img.tw-rotate-0').isVisible();
      if(mobileMenuVisible){
          await page.click('button#burgerIcon');
      }
  }*/
  await expect(page.locator("div#main-layout").nth(0)).toBeVisible();
}

export async function hideNoCamera(page: Page){
    await page.locator('form.helpCameraSettings button[type="submit"]').click();
}
