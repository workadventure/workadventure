import {expect, test } from '@playwright/test';
import Map from "./utils/map";
import {publicTestMapUrl} from "./utils/urls";
import {getPage} from "./utils/auth";
import {isMobile} from "./utils/isMobile";
import {expectLivekitConnectionsCountToBe, expectWebRtcConnectionsCountToBe , expectLivekitRoomsCountToBe} from "./utils/webRtc";
import { resetWamMaps } from './utils/map-editor/uploader';
import ConfigureMyRoom from "./utils/map-editor/configureMyRoom";
import Megaphone from "./utils/map-editor/megaphone";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";
import AreaLivekit from './utils/AreaLivekit';


test.setTimeout(240_000);

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

        // Let's enable the video quality display and test it works
        await Menu.openMenu(page);
        await page.getByRole('button', { name: 'All settings' }).click();
        await page.getByText('Display video quality').click();
        await page.locator('#closeMenu').click();
        await expect(page.getByRole('cell', { name: 'video/VP8' }).first()).toBeVisible();

        // Let's disable the video quality display and test it is no longer displayed
        await Menu.openMenu(page);
        await page.getByRole('button', { name: 'All settings' }).click();
        await page.getByText('Display video quality').click();
        await page.locator('#closeMenu').click();
        await expect(page.getByRole('cell', { name: 'video/VP8' }).first()).toBeHidden();


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

        // At this point, we should have 2 webRtc connections open
        await expectWebRtcConnectionsCountToBe(page, 2);

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

        // At this point, we should have 0 webRtc connections open and 4 livekit connections
        await expectLivekitConnectionsCountToBe(page, 4);
        await expectWebRtcConnectionsCountToBe(page, 0);

        // Let's move out 2 users (because depending on the machine, the number where we switch from WebRtc to Livekit may be 4 or 5)
        await Map.teleportToPosition(userJohn, 16, 16);
        await Map.teleportToPosition(userMallory, 300, 300);

        // We need to wait 20 seconds for the complete switch to be done
        await new Promise<void>(resolve => {setTimeout(resolve, 25000)});

        // At this point, we should have 2 webRtc connections open and 0 livekit connections
        await expectLivekitConnectionsCountToBe(page, 0);
        await expectWebRtcConnectionsCountToBe(page, 2);

        // Now, let's enter and exit the meeting area very quickly to check that the switch to Livekit and back to WebRtc is working fine
        await Map.teleportToPosition(userJohn, 160, 160);
        await Map.teleportToPosition(userMallory, 160, 160);
        await Map.teleportToPosition(userJohn, 16, 16);
        await Map.teleportToPosition(userMallory, 300, 300);

        await expectLivekitConnectionsCountToBe(userMallory, 0);
        await expectWebRtcConnectionsCountToBe(userMallory, 0);
        await expectLivekitConnectionsCountToBe(userJohn, 0);
        await expectWebRtcConnectionsCountToBe(userJohn, 0);

        // We need to wait 20 seconds for things to stabilize
        await new Promise<void>(resolve => {setTimeout(resolve, 25000)});

        // At this point, we should have again 2 webRtc connections open and 0 livekit connections
        await expectLivekitConnectionsCountToBe(page, 0);
        await expectWebRtcConnectionsCountToBe(page, 2);

        // Now, let's put all users back in Livekit
        await Map.teleportToPosition(userJohn, 160, 160);
        await Map.teleportToPosition(userMallory, 160, 160);

        // Verify that all 5 users are present in the camera container
        await expect(page.locator('#cameras-container').getByText("You")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("Bob")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("Eve")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("Mallory")).toBeVisible({timeout: 30_000});
        await expect(page.locator('#cameras-container').getByText("John")).toBeVisible({timeout: 30_000});

        // At this point, we should have 0 webRtc connections open and 4 livekit connections
        await expectLivekitConnectionsCountToBe(page, 4);
        await expectWebRtcConnectionsCountToBe(page, 0);

        // Let's remove ONLY one user (if the WEB RTC threshold is at 4, we stay in Livekit)
        await Map.teleportToPosition(userJohn, 16, 16);

        await expectLivekitConnectionsCountToBe(page, 3);
        await expectWebRtcConnectionsCountToBe(page, 0);

        // Now, John moves back to the meeting area. He should see everyone and everyone should see him
        await Map.teleportToPosition(userJohn, 160, 160);
        await expect(page.locator('#cameras-container').getByText("John")).toBeVisible({timeout: 30_000});
        await expect(userJohn.locator('#cameras-container').getByText("Bob")).toBeVisible({timeout: 30_000});

        await expectLivekitConnectionsCountToBe(page, 4);
        await expectWebRtcConnectionsCountToBe(page, 0);


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

    test("Should create and join livekit room only when there is a speaker @oidc", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await Map.teleportToPosition(page, 0, 0);

        // Second browser
        await using page2 = await getPage(browser, 'Admin2',  Map.url("empty"));
        await Map.teleportToPosition(page2, 4 * 32, 0);
        

        await Menu.openMapEditor(page);
        await MapEditor.openConfigureMyRoom(page);
        await ConfigureMyRoom.selectMegaphoneItemInCMR(page);
        
        // Enabling megaphone and settings default value
        await Megaphone.toggleMegaphone(page);
        await Megaphone.isMegaphoneEnabled(page);
        await Megaphone.megaphoneSave(page);
        // Wait for the megaphone settings to be saved
        await Megaphone.isCorrectlySaved(page);
        // Close the configuration popup
        await Menu.closeMapEditorConfigureMyRoomPopUp(page);
        
        
        
        // Go to the empty map
        await using userAlice = await getPage(browser, 'Alice', Map.url("empty"));

        // Move user Alice to the meeting area
        await Map.teleportToPosition(userAlice, 8 * 32, 0);
        
        // Create and position 4 additional users
        await using userBob = await getPage(browser, 'Bob', Map.url("empty"));
        await Map.teleportToPosition(userBob, 0, 8 * 32);

        await using userEve = await getPage(browser, 'Eve', Map.url("empty"));
        await Map.teleportToPosition(userEve, 0, 4 * 32);
        

        await Menu.toggleMegaphoneButton(page);


        // Click on the button to start live message
        page
            .locator(".menu-container #content-liveMessage")
        await expect(page.getByRole('button', { name: 'Start live message' })).toBeVisible();
        await page.getByRole('button', { name: 'Start live message' }).click({ timeout: 10_000 });


        await expectLivekitRoomsCountToBe(page, 0);
        await expectLivekitRoomsCountToBe(page2, 0);
        await expectLivekitRoomsCountToBe(userAlice, 0);
        await expectLivekitRoomsCountToBe(userBob, 0);
        await expectLivekitRoomsCountToBe(userEve, 0);


        page
            .locator(".menu-container #active-liveMessage")
        await expect(page.getByRole('button', { name: 'Start megaphone' })).toBeVisible();
        await page.getByRole('button', { name: 'Start megaphone' }).click({ timeout: 10_000 });

        
        
        // click on the megaphone button to start the streaming session
        await expect(page2.getByText('Admin1', { exact: true })).toBeVisible({ timeout: 15_000 });
        await expect(userAlice.getByText('Admin1', { exact: true })).toBeVisible({ timeout: 15_000 });
        await expect(userBob.getByText('Admin1', { exact: true })).toBeVisible({ timeout: 15_000 });
        await expect(userEve.getByText('Admin1', { exact: true })).toBeVisible({ timeout: 15_000 });
        
        await expectLivekitRoomsCountToBe(userAlice, 1);
        await expectLivekitRoomsCountToBe(userBob, 1);
        await expectLivekitRoomsCountToBe(userEve, 1);
        await expectLivekitRoomsCountToBe(page2, 1);
        await expectLivekitRoomsCountToBe(page, 1); 

        await page.getByRole('button', { name: 'Stop megaphone' }).click();
        await expect(page.getByRole('heading', { name: 'Global communication' })).toBeHidden();

        await expectLivekitRoomsCountToBe(page, 0);
        await expectLivekitRoomsCountToBe(page2, 0);
        await expectLivekitRoomsCountToBe(userAlice, 0);
        await expectLivekitRoomsCountToBe(userBob, 0);
        await expectLivekitRoomsCountToBe(userEve, 0);


        await Menu.toggleMegaphoneButton(page);

    await expect(page.getByRole('button', { name: 'Start live message' })).toBeVisible();
    await page.getByRole('button', { name: 'Start live message' }).click({ timeout: 10_000 });

        page
        .locator(".menu-container #active-liveMessage")
    await expect(page.getByRole('button', { name: 'Start megaphone' })).toBeVisible();
    await page.getByRole('button', { name: 'Start megaphone' }).click({ timeout: 10_000 });

    await expect(page2.getByText('Admin1', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(userAlice.getByText('Admin1', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(userBob.getByText('Admin1', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(userEve.getByText('Admin1', { exact: true })).toBeVisible({ timeout: 15_000 });


    await expectLivekitRoomsCountToBe(userAlice, 1);
    await expectLivekitRoomsCountToBe(userBob, 1);
    await expectLivekitRoomsCountToBe(userEve, 1);
    await expectLivekitRoomsCountToBe(page2, 1);
    await expectLivekitRoomsCountToBe(page, 1); 

    await page.getByRole('button', { name: 'Stop megaphone' }).click();
    await expect(page.getByRole('heading', { name: 'Global communication' })).toBeHidden();

    await expectLivekitRoomsCountToBe(page, 0);
    await expectLivekitRoomsCountToBe(page2, 0);
    await expectLivekitRoomsCountToBe(userAlice, 0);
    await expectLivekitRoomsCountToBe(userBob, 0);
    await expectLivekitRoomsCountToBe(userEve, 0);

        await page2.context().close();
        await page.context().close();
        await userAlice.context().close();
        await userBob.context().close();
        await userEve.context().close();
    });

    test("should keep microphone and camera state when joining/leaving a livekit room @oidc", async ({ browser , request }) => {

        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await Map.teleportToPosition(page, 0, 0);

        await AreaLivekit.openAreaEditorAndAddAreaLivekit(page, true, true);

        await Map.teleportToPosition(page,
        AreaLivekit.mouseCoordinatesToClickOnEntityInsideArea.x,
        AreaLivekit.mouseCoordinatesToClickOnEntityInsideArea.y,
        );

        await Map.teleportToPosition(page, 0, 0);


        await Menu.expectButtonState(page, "microphone-button", 'normal');
        await Menu.expectButtonState(page, "camera-button", 'normal');

        await Map.teleportToPosition(page, 
        AreaLivekit.mouseCoordinatesToClickOnEntityInsideArea.x,
        AreaLivekit.mouseCoordinatesToClickOnEntityInsideArea.y,
        );

        await page.getByTestId("camera-button").click();

        await Map.teleportToPosition(page, 0, 0);
        await Menu.expectButtonState(page, "camera-button", 'normal');
        await Menu.expectButtonState(page, "microphone-button", 'forbidden');

        await page.context().close();
        await page.close();



    });



});
