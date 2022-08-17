import {expect, Page} from '@playwright/test';

export async function login(
  page: Page,
  userName: string = 'Alice',
  characterNumber: number = 2,
  browserLanguage: string | null = 'en-US'
) {
  // window.localStorage.setItem('language', browserLanguage)

  await page.fill('input[name="loginSceneName"]', userName);
  await page.click('button.loginSceneFormSubmit');

  await page.waitForTimeout(1000);
  for (let i = 0; i < characterNumber; i++) {
    await page.keyboard.press('ArrowRight');
  }

  await page.click('button.selectCharacterSceneFormSubmit');
  await page.click('button.letsgo');

  await expect(page.locator("button#menuIcon")).toBeVisible();
}
