import {expect, test} from '@playwright/test';

test.describe('Swgger documentation', () => {
    test('Admin -> External Admin', async ({ page }) => {
        await page.goto(
            'http://play.workadventure.localhost/swagger-ui/?urls.primaryName=Admin%20->%20External%20Admin'
        );

        // Check the component "ExternalAdminAPI-get_api_mapinformation" of the Webpage
        await expect(page.locator('#operations-ExternalAdminAPI-get_api_mapinformation')).toHaveCount(1);

        // Check the component "ExternalAdminAPI-get_api_roomaccess" of the Webpage
        await expect(page.locator('#operations-ExternalAdminAPI-get_api_roomaccess')).toHaveCount(1);

        // Check the component "ExternalAdminAPI-get_api_loginurl__organizationMemberToken_" of the Webpage
        await expect(page.locator('#operations-ExternalAdminAPI-get_api_loginurl__organizationMemberToken_')).toHaveCount(1);
    });

    test('Pusher -> Admin', async ({ page }) => {
        await page.goto(
            'http://play.workadventure.localhost/swagger-ui/?urls.primaryName=Pusher%20->%20Admin'
        );

        // Check the component "operations-tag-AdminAPI" of the Webpage
        await expect(page.locator('#operations-tag-AdminAPI')).toHaveCount(1);
    });

    test('Front -> Pusher <- Admin', async ({ page }) => {
        await page.goto(
            'http://play.workadventure.localhost/swagger-ui/?urls.primaryName=Front%20->%20Pusher%20<-%20Admin'
        );
        //TODO
    });
});