import {Page} from '@playwright/test';

export function isMobile(page: Page) {
    /*
    a width of 1280 and a height of 720 is default on playwright if below it must be a phone
    return True if it's a phone
    TODO adapt do make the difference between tablet and phone
     */
    return page.viewportSize().width < 1280 && page.viewportSize().height < 750;
}