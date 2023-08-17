import {expect, Page} from '@playwright/test';

export async function login(
    page: Page,
    userName = 'Alice',
    characterNumber = 2,
    browserLanguage: string | null = 'en-US'
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

export async function selectMedias(page: Page) {
  await expect(page.locator('h2', { hasText: "Turn on your camera and microphone" })).toBeVisible();

  await page.click("text=Let's go!");

  await expect(page.locator("button#menuIcon").nth(0)).toBeVisible();
}

export async function hideNoCamera(page: Page){
  await page.locator('form.helpCameraSettings button[type="submit"]').click();
}