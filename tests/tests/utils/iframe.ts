import {Locator, Page} from "@playwright/test";

export function getCoWebsiteDiv(page: Page): Locator {
    return page.locator('#cowebsites-container');
  }
