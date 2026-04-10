import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import Map from "./utils/map";

import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

import { resetWamMaps } from "./utils/map-editor/uploader";

import ConfigureMyRoom from "./utils/map-editor/configureMyRoom";
import Megaphone from "./utils/map-editor/megaphone";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";
import {
    clickRecordingSpacePickerAction,
    closeRecordingCompletedToast,
    deleteAllRecordings,
    expectRecordingSpacePickerAction,
    openRecordingSpacePicker,
    waitForDualRecordingStopControls,
    waitForMegaphoneToBeStreaming,
    waitForRecordingToAppear,
} from "./utils/recording";

test.setTimeout(240_000);

async function openMegaphoneSettings(page: Page) {
    const configureMyRoomButton = page.locator(
        "section.side-bar-container .side-bar .tool-button button#WAMSettingsEditor",
    );

    if (!(await configureMyRoomButton.isVisible())) {
        await Menu.openMapEditor(page);
    }

    await MapEditor.openConfigureMyRoom(page);
    await ConfigureMyRoom.selectMegaphoneItemInCMR(page);
}

async function saveMegaphoneSettings(page: Page, { closePopup = true }: { closePopup?: boolean } = {}) {
    await Megaphone.megaphoneSave(page);
    await Megaphone.isCorrectlySaved(page);
    await expect(page.getByRole("button", { name: "Megaphone settings saved" })).toBeHidden();

    if (closePopup) {
        await Menu.closeMapEditorConfigureMyRoomPopUp(page);
    }
}

test.describe("Recording test", () => {
    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({ browserName, page, browser }) => {
            //Map Editor not available on mobile and webkit have issue with camera
            if (browserName === "webkit" || isMobile(page) || browser.browserType().name() === "firefox") {
                test.skip();
                return;
            }
        },
    );

    test("Recording should start and stop correctly @oidc", async ({ browser, request }) => {
        await resetWamMaps(request);
        // Go to the empty map
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await Map.teleportToPosition(page, 0, 0);

        await deleteAllRecordings(page);

        // Second browser
        await using page2 = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(page2, 0, 0);

        await expect(page.getByTestId("recordingButton-start")).toBeEnabled();

        await page.getByTestId("recordingButton-start").click();

        await expect(page2.getByTestId("recording-started-modal")).toBeVisible();

        // register record during 5 seconds
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(5000);

        await expect(page.getByTestId("recordingButton-stop")).toBeEnabled();

        await expect(page2.getByTestId("recordingButton-start")).toBeDisabled();

        await page.getByTestId("recordingButton-stop").click();

        // Wait for the recording to complete
        await expect(page.getByTestId("recording-completed-modal")).toBeVisible();

        // Click on the modal button to open the recordings list
        await page.getByTestId("recording-completed-modal-open-recordings-list-button").click();

        await expect(page.getByTestId(`recording-item-0`)).toBeVisible();
        await page.getByTestId("close-recording-modal").click();

        await expect(page.getByTestId("recordingButton-start")).toBeEnabled();

        await page.getByTestId("recordingButton-start").click();

        // Second browser
        await using page3 = await getPage(browser, "Alice", Map.url("empty"));
        await Map.teleportToPosition(page3, 0, 0);
        // Wait for moving to the new position
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page3.waitForTimeout(1000);
        await expect(page3.getByTestId("recording-started-modal")).toBeVisible();

        await Map.teleportToPosition(page, 8 * 32, 8 * 32);
        // Wait for moving to the new position
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1000);

        await page.getByTestId("apps-button").click();

        await page.getByTestId("recordingButton-list").click();
        await waitForRecordingToAppear(page, 0);

        await expect(page.getByTestId("recording-item-0")).toBeVisible({ timeout: 5000 });

        await page.getByTestId("close-recording-modal").click();

        await Map.walkToPosition(page2, 8 * 32, 8 * 32);
        await page.getByTestId("recordingButton-start").click();
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(5000);

        await Map.teleportToPosition(page2, 0, 0);
        // Wait for moving to the new position
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page2.waitForTimeout(1000);

        await page.getByTestId("apps-button").click();
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(3000);
        await page.getByTestId("recordingButton-list").click();

        await waitForRecordingToAppear(page, 2);

        await page.close();
        await page2.close();
        await page3.close();
        await page2.context().close();
        await page.context().close();
        await page3.context().close();
    });

    test("Recording configuration @oidc", async ({ browser, request }) => {
        await resetWamMaps(request);
        // Go to the empty map
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await Map.teleportToPosition(page, 0, 0);

        await Menu.openMapEditor(page);
        await MapEditor.openConfigureMyRoom(page);
        await ConfigureMyRoom.selectRecordingItemInCMR(page);

        // We use the same code as megaphone for the configuration UI, since the "rights" field is common to both features.
        await Megaphone.megaphoneAddNewRights(page, "foo");

        await page.getByRole("button", { name: "Save" }).click();

        // Now, let's start a recording to see if the rights are correctly applied.
        await using page2 = await getPage(browser, "Member1", Map.url("empty"));
        await Map.teleportToPosition(page2, 0, 0);

        // The admin can still see the recording button
        await expect(page.getByTestId("recordingButton-start")).toBeVisible();
        // The member (without the "foo" tag) should not see the recording button
        await expect(page2.getByTestId("recordingButton-start")).toBeHidden();

        await Map.teleportToPosition(page2, 160, 160);

        // Let's now configure the "member" tag instead of "foo"
        await Megaphone.megaphoneRemoveRights(page, "foo");
        await Megaphone.megaphoneAddNewRights(page, "member");
        await page.getByRole("button", { name: "Save" }).click();
        await expect(page.getByRole("button", { name: "Recording settings saved" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Recording settings saved" })).toBeHidden();

        await Map.teleportToPosition(page2, 0, 0);

        // The admin can still see the recording button
        await expect(page.getByTestId("recordingButton-start")).toBeVisible();
        // The member (with the "member" tag) should now see the recording button
        await expect(page2.getByTestId("recordingButton-start")).toBeVisible();
    });

    test("Recording can run in megaphone and discussion spaces at the same time @oidc", async ({
        browser,
        request,
    }) => {
        await resetWamMaps(request);

        // Admin1: megaphone broadcaster + map config
        await using broadcaster = await getPage(browser, "Admin1", Map.url("empty"));
        await Map.teleportToPosition(broadcaster, 4 * 32, 0);
        await deleteAllRecordings(broadcaster);

        await Menu.openMapEditor(broadcaster);
        await MapEditor.openConfigureMyRoom(broadcaster);
        await ConfigureMyRoom.selectMegaphoneItemInCMR(broadcaster);
        await Megaphone.toggleMegaphone(broadcaster);
        await Megaphone.isMegaphoneEnabled(broadcaster);
        // Megaphone recording is off by default; enable it like "Megaphone recording permissions update without reload…".
        await Megaphone.toggleMegaphoneRecording(broadcaster);
        await Megaphone.megaphoneSave(broadcaster);
        await Megaphone.isCorrectlySaved(broadcaster);
        await Menu.closeMapEditorConfigureMyRoomPopUp(broadcaster);

        await Menu.clickSendGlobalMessage(broadcaster);
        await Menu.clickStartLiveMessage(broadcaster);
        await Menu.clickStartMegaphone(broadcaster);
        await waitForMegaphoneToBeStreaming(broadcaster);

        // Admin2: records both spaces; Bob: visible tile so megaphone space is active
        await using recorder = await getPage(browser, "Admin2", Map.url("empty"));
        await Map.teleportToPosition(recorder, 4 * 32, 0);

        await using participant = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(participant, 4 * 32, 0);

        await expect(recorder.locator("#cameras-container").getByText("Admin1")).toBeVisible({ timeout: 30_000 });
        await expect(recorder.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });

        await openRecordingSpacePicker(recorder, "start");
        await expectRecordingSpacePickerAction(recorder, "megaphone", "start");
        await expectRecordingSpacePickerAction(recorder, "discussion", "start");
        await clickRecordingSpacePickerAction(recorder, "megaphone", "start");

        await openRecordingSpacePicker(recorder, "stop");
        await clickRecordingSpacePickerAction(recorder, "discussion", "start");

        await waitForDualRecordingStopControls(recorder);

        // Allow the recording pipeline time to produce media for both spaces before stopping.
        await recorder.waitForTimeout(5000);

        await openRecordingSpacePicker(recorder, "stop");
        await expectRecordingSpacePickerAction(recorder, "megaphone", "stop");
        await expectRecordingSpacePickerAction(recorder, "discussion", "stop");

        await clickRecordingSpacePickerAction(recorder, "discussion", "stop");
        await closeRecordingCompletedToast(recorder);

        await openRecordingSpacePicker(recorder, "stop");
        await expectRecordingSpacePickerAction(recorder, "megaphone", "stop");
        await clickRecordingSpacePickerAction(recorder, "megaphone", "stop");

        await expect(recorder.getByTestId("recording-completed-modal")).toBeVisible();
        await recorder.getByTestId("recording-completed-modal-open-recordings-list-button").click();

        await waitForRecordingToAppear(recorder, 1);
        await expect(recorder.getByTestId("recording-item-0")).toBeVisible();
        await expect(recorder.getByTestId("recording-item-1")).toBeVisible();
    });

    test("Megaphone recording permissions update without reload and respect tags @oidc", async ({
        browser,
        request,
    }) => {
        await resetWamMaps(request);
        const speakerPosition = { x: 4 * 32, y: 0 };
        const adminListenerFarPosition = { x: 30 * 32, y: 0 };
        const memberListenerFarPosition = { x: 30 * 32, y: 12 * 32 };

        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        await Map.teleportToPosition(page, speakerPosition.x, speakerPosition.y);

        await Menu.openMapEditor(page);
        await openMegaphoneSettings(page);

        // Megaphone is usable, but megaphone recording is OFF by default.
        await Megaphone.toggleMegaphone(page);
        await Megaphone.isMegaphoneEnabled(page);
        await saveMegaphoneSettings(page);

        await using adminListener = await getPage(browser, "Admin2", Map.url("empty"));
        await Map.teleportToPosition(adminListener, adminListenerFarPosition.x, adminListenerFarPosition.y);
        await using memberListener = await getPage(browser, "Member1", Map.url("empty"));
        await Map.teleportToPosition(memberListener, memberListenerFarPosition.x, memberListenerFarPosition.y);

        // Start the megaphone and close the setup modal without stopping the stream.
        await Menu.clickSendGlobalMessage(page);
        await Menu.clickStartLiveMessage(page);
        await Menu.clickStartMegaphone(page);
        await page.keyboard.press("Escape");

        await expect(adminListener.locator("#cameras-container").getByText("Admin1", { exact: true })).toBeVisible({
            timeout: 20_000,
        });
        await expect(memberListener.locator("#cameras-container").getByText("Admin1", { exact: true })).toBeVisible({
            timeout: 20_000,
        });

        // Switch OFF blocks megaphone recording, including for admins. Listeners are too far away for discussion recording.
        await expect(adminListener.getByTestId("recordingButton-start")).toBeHidden();
        await expect(memberListener.getByTestId("recordingButton-start")).toBeHidden();

        // Empty recording rights mean every logged user who can listen to the megaphone can record it.
        await openMegaphoneSettings(page);
        await Megaphone.toggleMegaphoneRecording(page);
        await saveMegaphoneSettings(page, { closePopup: false });

        await expect(adminListener.locator("#cameras-container").getByText("Admin1", { exact: true })).toBeVisible();
        await expect(memberListener.locator("#cameras-container").getByText("Admin1", { exact: true })).toBeVisible();
        await expect(adminListener.getByTestId("recordingButton-start")).toBeVisible();
        await expect(memberListener.getByTestId("recordingButton-start")).toBeVisible();

        // When a discussion and a recordable megaphone are both available, the picker contains both spaces.
        await Map.teleportToPosition(adminListener, speakerPosition.x, speakerPosition.y);
        await Map.teleportToPosition(memberListener, speakerPosition.x, speakerPosition.y);
        await expect(adminListener.locator("#cameras-container").getByText("Member1", { exact: true })).toBeVisible({
            timeout: 20_000,
        });
        await adminListener.getByTestId("recordingButton-start").click();
        await expect(adminListener.getByTestId("recording-space-picker")).toBeVisible();
        await expect(adminListener.getByText("Record megaphone")).toBeVisible();
        await expect(adminListener.getByText("Record discussion")).toBeVisible();
        await expect(adminListener.getByTestId("recording-space-option-0")).toBeVisible();
        await expect(adminListener.getByTestId("recording-space-option-1")).toBeVisible();
        await adminListener.getByTestId("recordingButton-start").click();
        await expect(adminListener.getByTestId("recording-space-picker")).toBeHidden();

        // A non-matching recording tag hides megaphone recording from the member, while admin bypasses tag lists.
        await Map.teleportToPosition(adminListener, adminListenerFarPosition.x, adminListenerFarPosition.y);
        await Map.teleportToPosition(memberListener, memberListenerFarPosition.x, memberListenerFarPosition.y);
        await expect(adminListener.locator("#cameras-container").getByText("Member1", { exact: true })).toBeHidden({
            timeout: 20_000,
        });
        await expect(memberListener.locator("#cameras-container").getByText("Admin2", { exact: true })).toBeHidden({
            timeout: 20_000,
        });
        await expect(adminListener.locator("#cameras-container").getByText("Admin1", { exact: true })).toBeVisible();
        await expect(memberListener.locator("#cameras-container").getByText("Admin1", { exact: true })).toBeVisible();
        await Megaphone.megaphoneAddRecordingRights(page, "foo");
        await saveMegaphoneSettings(page, { closePopup: false });

        await expect(adminListener.getByTestId("recordingButton-start")).toBeVisible();
        await expect(memberListener.getByTestId("recordingButton-start")).toBeHidden();
        await expect(memberListener.locator("#cameras-container").getByText("Admin1", { exact: true })).toBeVisible();

        // Adding the member tag applies immediately to the existing megaphone listener space.
        await Megaphone.megaphoneAddRecordingRights(page, "member");
        await saveMegaphoneSettings(page, { closePopup: false });

        await expect(adminListener.getByTestId("recordingButton-start")).toBeVisible();
        await expect(memberListener.getByTestId("recordingButton-start")).toBeVisible();
        await expect(memberListener.locator("#cameras-container").getByText("Admin1", { exact: true })).toBeVisible();
    });
});
