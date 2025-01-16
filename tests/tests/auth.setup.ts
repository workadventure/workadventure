import { test as setup, expect } from 'playwright/test';
import { publicTestMapUrl } from "./utils/urls";

export const aliceStorageTest = './.auth/Alice.json'
export const bobStorageTest = './.auth/Bob.json'
//const John = './.auth/John.json'
const characterNumber = 3;

setup('login as user', async ({ page }) => {
    await page.goto(
        publicTestMapUrl(`tests/RemotePlayers/remote_players.json`, "api-players")
    );
    
    //login
    await page.fill('input[name="loginSceneName"]', "Alice");
    await page.click('button.loginSceneFormSubmit');
    await expect(page.locator('button.selectCharacterSceneFormSubmit')).toBeVisible();
    for (let i = 0; i < characterNumber; i++) {
        await page.keyboard.press('ArrowRight');
        }
    
    await page.click('button.selectCharacterSceneFormSubmit');

    //selectMedia
    await expect(page.locator('h2', { hasText: "Turn on your camera and microphone" })).toBeVisible();

    await page.click("text=Save");

    await expect(page.locator("div#main-layout").nth(0)).toBeVisible();
});