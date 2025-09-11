import {expect, test } from '@playwright/test';
import Map from "./utils/map";
import {publicTestMapUrl} from "./utils/urls";
import {getPage} from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.describe('Meeting actions test', () => {

    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({ browserName, page , browser }) => {
            //Map Editor not available on mobile adn webkit have issue with camera
            if (browserName === "webkit" || isMobile(page) || browser.browserType().name() === "firefox") {
                 
                test.skip();
                return;
            }
        }
    );


    test('Should display 4 cameras on screen', async ({ browser }) => {
        
        // Go to the empty map
        await using page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "livekit"));

        // Move user Alice to the meeting area
        await Map.teleportToPosition(page, 160, 160);
        
        // Create axpnd position 3 additional users
        await using userBob = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "livekit"));
        await Map.teleportToPosition(userBob, 160, 160);

        await using userEve = await getPage(browser, 'Eve', publicTestMapUrl("tests/E2E/empty.json", "livekit"));
        await Map.teleportToPosition(userEve, 160, 160);

        await using userMallory = await getPage(browser, 'Mallory', publicTestMapUrl("tests/E2E/empty.json", "livekit"));
        await Map.teleportToPosition(userMallory, 160, 160);

        // Wait for the cameras container to be visible
        await expect(page.locator('#cameras-container')).toBeVisible({timeout: 30_000});

        // Verify that exactly 4 camera boxes are displayed
        // Each user (Alice, Bob, Eve, John) should have their camera visible
        await expect(page.locator('#cameras-container .camera-box')).toHaveCount(4, {timeout: 30_000});

        // Verify that all 4 users are present in the camera container
        await expect(page.locator('#cameras-container').getByText("You")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("Bob")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("Eve")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("Mallory")).toBeVisible({timeout: 30_000});

        // Clean up
        await page.close();
        await userBob.close();
        await userEve.close();
        await userMallory.close();
        await userBob.context().close();
        await userEve.context().close();
        await userMallory.context().close();
        await page.context().close();
    });

    test('Should display 5 cameras on screen', async ({ browser }) => {

        
        // Go to the empty map
        await using page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "livekit"));

        // Move user Alice to the meeting area
        await Map.teleportToPosition(page, 160, 160);
        
        // Create and position 4 additional users
        await using userBob = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "livekit"));
        await Map.teleportToPosition(userBob, 160, 160);

        await using userEve = await getPage(browser, 'Eve', publicTestMapUrl("tests/E2E/empty.json", "livekit"));
        await Map.teleportToPosition(userEve, 160, 160);

        await using userMallory = await getPage(browser, 'Mallory', publicTestMapUrl("tests/E2E/empty.json", "livekit"));
        await Map.teleportToPosition(userMallory, 160, 160);

        await using userJohn = await getPage(browser, 'John', publicTestMapUrl("tests/E2E/empty.json", "livekit"));
        await Map.teleportToPosition(userJohn, 160, 160);

        // Wait for the cameras container to be visible
        await expect(page.locator('#cameras-container')).toBeVisible({timeout: 30_000});

        // Verify that exactly 5 camera boxes are displayed
        // Each user (Alice, Bob, Eve, John and Mallory) should have their camera visible
        await expect(page.locator('#cameras-container .camera-box')).toHaveCount(5, {timeout: 30_000});

        // Verify that all 5 users are present in the camera container
        await expect(page.locator('#cameras-container').getByText("You")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("Bob")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("Eve")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("Mallory")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("John")).toBeVisible({timeout: 30_000});

        // Clean up
        await page.close();
        await userBob.close();
        await userEve.close();
        await userMallory.close();
        await userJohn.close();

        await userBob.context().close();
        await userEve.context().close();
        await userMallory.context().close();
        await userJohn.context().close();
        await page.context().close();
    });

});
