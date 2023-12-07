import {expect, test} from '@playwright/test';

test.describe('Swagger documentation', () => {
    test('Admin -> External Admin', async ({page}) => {
        await page.goto(
            `http://play.workadventure.localhost/swagger-ui/?urls.primaryName=Admin%20->%20External%20Admin`
        );

        // Test if the component "operations-ExternalAdminAPI-get_api_mapinformation" is visible
        await expect(page.locator('#operations-ExternalAdminAPI-get_api_mapinformation')).toBeVisible();

        // Test if the component "operations-ExternalAdminAPI-get_api_roomaccess" is visible
        await expect(page.locator('#operations-ExternalAdminAPI-get_api_roomaccess')).toBeVisible();

        // Test if the component "operations-ExternalAdminAPI-get_api_loginurl__organizationMemberToken_" is visible
        await expect(page.locator('#operations-ExternalAdminAPI-get_api_loginurl__organizationMemberToken_')).toBeVisible();

        // Test if the component "model-AdminApiData" is visible
        await expect(page.locator('#model-AdminApiData')).toBeVisible();

        // Test if the component "model-ErrorApiUnauthorizedData" is visible
        await expect(page.locator('#model-ErrorApiUnauthorizedData')).toBeVisible();

        // Test if the component "model-FetchMemberDataByUuidResponse" is visible
        await expect(page.locator('#model-FetchMemberDataByUuidResponse')).toBeVisible();

        // Test if the component "model-MapDetailsData" is visible
        await expect(page.locator('#model-MapDetailsData')).toBeVisible();

        // Test if the component "model-RoomRedirect" is visible
        await expect(page.locator('#model-RoomRedirect')).toBeVisible();

        // Test if the component "model-WokaDetail" is visible
        await expect(page.locator('#model-WokaDetail')).toBeVisible();
    });

    test('Pusher -> Admin', async ({page}) => {
        await page.goto(
            `http://play.workadventure.localhost/swagger-ui/?urls.primaryName=Pusher%20->%20Admin`
        );

        // Test if the component "model-AdminApiData" is visible
        await expect(page.locator('#model-AdminApiData')).toBeVisible();

        // Test if the component "model-Capabilities" is visible
        await expect(page.locator('#model-Capabilities')).toBeVisible();

        // Test if the component "model-CompanionTextureCollectionList" is visible
        await expect(page.locator('#model-CompanionTextureCollectionList')).toBeVisible();

        // Test if the component "model-CompanionDetail" is visible
        await expect(page.locator('#model-CompanionDetail')).toBeVisible();

        // Test if the component "model-CompanionTextureCollection" is visible
        await expect(page.locator('#model-CompanionTextureCollection')).toBeVisible();

        // Test if the component "model-ErrorApiErrorData" is visible
        await expect(page.locator('#model-ErrorApiErrorData')).toBeVisible();

        // Test if the component "model-ErrorApiRedirectData" is visible
        await expect(page.locator('#model-ErrorApiRedirectData')).toBeVisible();

        // Test if the component "model-ErrorApiRetryData" is visible
        await expect(page.locator('#model-ErrorApiRetryData')).toBeVisible();

        // Test if the component "model-ErrorApiUnauthorizedData" is visible
        await expect(page.locator('#model-ErrorApiUnauthorizedData')).toBeVisible();

        // Test if the component "model-FetchMemberDataByUuidResponse" is visible
        await expect(page.locator('#model-FetchMemberDataByUuidResponse')).toBeVisible();

        // Test if the component "model-MapDetailsData" is visible
        await expect(page.locator('#model-MapDetailsData')).toBeVisible();

        // Test if the component "model-RoomRedirect" is visible
        await expect(page.locator('#model-RoomRedirect')).toBeVisible();

        // Test if the component "model-WokaDetail" is visible
        await expect(page.locator('#model-WokaDetail')).toBeVisible();

        // Test if the component "model-WokaList" is visible
        await expect(page.locator('#model-WokaList')).toBeVisible();

        // Test if the component "model-WokaTexture" is visible
        await expect(page.locator('#model-WokaTexture')).toBeVisible();

    });
});