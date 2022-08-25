import { Page } from '@playwright/test';

export async function oidcLogin(
    page: Page,
    userName = 'User1',
    password = 'pwd'
) {
    await page.click('#menuIcon img:first-child');
    await page.click('a:has-text("Sign in")');

    await page.fill('#Input_Username', userName);
    await page.fill('#Input_Password', password);

    await page.click('button:has-text("Login")');
}

export async function oidcLogout(
    page: Page,
) {
    await page.click('#menuIcon img:first-child');
    await page.click('button:has-text("Log out")');
}
