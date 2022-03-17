import { Page } from '@playwright/test';

export async function login(
  page: Page,
  userName: string = 'Alice',
  characterNumber: number = 2,
  browserLanguage: string | null = 'en-US'
) {
  // window.localStorage.setItem('language', browserLanguage)

  await page.fill('input[name="loginSceneName"]', userName);
  await page.click('button.loginSceneFormSubmit');

  for (let i = 0; i < characterNumber; i++) {
    await page.click('button.selectCharacterButtonRight');
  }

  await page.click('button.selectCharacterSceneFormSubmit');
  await page.click('button.letsgo');
}
