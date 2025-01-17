import fs from 'fs';
import { BrowserContext, chromium, expect, Page } from 'playwright/test';
import { publicTestMapUrl } from "./utils/urls";

export const aliceStorageTest = './.auth/Alice.json'
export const bobStorageTest = './.auth/Bob.json'
export const johnStoragetest = './.auth/John.json'
export const characterNumber = 3;

function isJsonCreate(name: string): boolean {
    return fs.existsSync('./.auth/' + name + '.json')
}

export async function createUser(name='Alice'): Promise<void> {
    
    if(isJsonCreate(name)) {
        console.log("File " + name + " exist");
        return;
    }
    console.log("File " + name + " don't exist");
    const browser = await chromium.launch({headless: true});

    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();
    
    await page.goto(
        publicTestMapUrl(`tests/RemotePlayers/remote_players.json`, "api-players")
    );
    // login
    await page.fill('input[name="loginSceneName"]', name);
    await page.click('button.loginSceneFormSubmit');
    await expect(page.locator('button.selectCharacterSceneFormSubmit')).toBeVisible();
    for (let i = 0; i < characterNumber; i++) {
        await page.keyboard.press('ArrowRight');
    }
    await page.click('button.selectCharacterSceneFormSubmit');

    // selectMedia

    await expect(page.locator('h2', { hasText: "Turn on your camera and microphone" })).toBeVisible();

    await page.click("text=Save");

    await expect(page.locator("div#main-layout").nth(0)).toBeVisible();

    await page.context().storageState({ path: './.auth/' + name + '.json'})

    await page.close();
    await context.close();
    await browser.close();
}