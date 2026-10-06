import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import Menu from "./utils/menu";
import { expectLivekitConnectionsCountToBe } from "./utils/webRtc";
import { createLivekitOutageSwitch } from "./utils/livekitOutage";

// The LiveKit network outage part waits for livekit-client to give up reconnecting (10 attempts, ~50s)
test.setTimeout(300_000);

test.describe("Screen-sharing tests @nomobile @nowebkit @nofirefox", () => {
    test("Can start screen-sharing", async ({ browser }) => {
        // Alice will lose her connection to the LiveKit server at the end of the test: the outage switch must be
        // installed before her page loads.
        const aliceLivekitOutage = createLivekitOutageSwitch();
        // Go to the empty map
        await using userAlice = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/E2E/empty.json", "screensharing"),
            { pageCreatedHook: aliceLivekitOutage.install },
        );

        // Move user
        await Map.teleportToPosition(userAlice, 160, 160);
        await using userBob = await getPage(browser, "Bob", publicTestMapUrl("tests/E2E/empty.json", "screensharing"));

        // Move user
        await Map.teleportToPosition(userBob, 160, 160);

        // The user in the bubble meeting should be visible
        //await expect(page.locator('#container-media')).toBeVisible({timeout: 30_000});
        // The user in the bubble meeting should have action button
        await expect(userAlice.locator("#cameras-container").getByText("You")).toBeVisible();

        // Let's start screen sharing
        await userAlice.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(userAlice, "screenShareButton", "active");

        // There are 2 video streams for Alice: her camera and her screen
        await expect(userAlice.locator("#cameras-container").getByText("You")).toHaveCount(2);

        // Bob sees Alice screen-sharing in big (in the highlighted media area)
        await expect(userBob.locator("#highlighted-media").getByText("Alice")).toBeVisible();

        // Alice stops screen sharing
        await userAlice.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(userAlice, "screenShareButton", "normal");

        // There is 1 video stream for Alice: her camera
        await expect(userAlice.locator("#cameras-container").getByText("You")).toHaveCount(1);

        // Bob no longer sees Alice in big (in the highlighted media area)
        await expect(userBob.locator("#highlighted-media").getByText("Alice")).toHaveCount(0);

        ////////////////////////// Now, let's do a double screen-sharing /////////////////////////

        // Alice starts screen sharing
        await userAlice.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(userAlice, "screenShareButton", "active");

        // Bob sees Alice screen-sharing in big (in the highlighted media area)
        await expect(userBob.locator("#highlighted-media").getByText("Alice")).toBeVisible();

        // Bob starts screen sharing
        await userBob.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(userBob, "screenShareButton", "active");

        // There are 2 video streams for Bob: his camera and his screen
        await expect(userBob.locator("#cameras-container").getByText("You")).toHaveCount(2);

        // Alice sees Bob screen-sharing in big (in the highlighted media area)
        await expect(userAlice.locator("#highlighted-media").getByText("Bob")).toBeVisible();

        // Bob stops screen sharing again
        await userBob.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(userBob, "screenShareButton", "normal");

        // There is 1 video stream for Bob: his camera
        await expect(userBob.locator("#cameras-container").getByText("You")).toHaveCount(1);

        // Alice is still screen-sharing in big (in the highlighted media area)
        await expect(userBob.locator("#highlighted-media").getByText("Alice")).toBeVisible();

        // Alice no longer sees Bob screen-sharing in big (in the highlighted media area)
        await expect(userAlice.locator("#highlighted-media").getByText("Bob")).toBeHidden();

        // Wait a bit to be sure the P2P MediaStream "removetrack" events are processed in RemotePeer.
        // If we receive the MediaStream to late, we could close the new media.
        // Note: this is a workaround for a test flakiness, not a solution to the problem.
        // The upcoming single ID for a video might help to fix this issue more properly.

        await userAlice.waitForTimeout(1000);

        // Bob starts screen sharing again
        await userBob.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(userBob, "screenShareButton", "active");

        // There are 2 video streams for Bob: his camera and his screen
        await expect(userBob.locator("#cameras-container").getByText("You")).toHaveCount(2);

        // Alice sees Bob screen-sharing in big (in the highlighted media area)
        await expect(userAlice.locator("#highlighted-media").getByText("Bob")).toBeVisible();

        // Alice stops screen sharing
        await userAlice.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(userAlice, "screenShareButton", "normal");

        // There is 1 video stream for Alice: her camera
        await expect(userAlice.locator("#cameras-container").getByText("You")).toHaveCount(1);

        // Bob is still screen-sharing in big (in the highlighted media area)
        await expect(userAlice.locator("#highlighted-media").getByText("Bob")).toBeVisible();

        // Bob stops screen sharing
        await userBob.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(userBob, "screenShareButton", "normal");

        // There is 1 video stream for Bob: his camera
        await expect(userBob.locator("#cameras-container").getByText("You")).toHaveCount(1);

        // Nobody is screen-sharing in big (in the highlighted media area)
        await expect(userAlice.locator("#highlighted-media").getByText("Bob")).toHaveCount(0);
        await expect(userBob.locator("#highlighted-media").getByText("Alice")).toHaveCount(0);

        ////////////////////////// Now, add a third use while a screen-sharing is in process /////////////////////////

        // Alice starts screen sharing
        await userAlice.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(userAlice, "screenShareButton", "active");

        // Eve joins the meeting
        await using userEve = await getPage(browser, "Eve", publicTestMapUrl("tests/E2E/empty.json", "screensharing"));
        await Map.teleportToPosition(userEve, 160, 160);

        // Eve sees Alice screen-sharing in big (in the highlighted media area)
        await expect(userEve.locator("#highlighted-media").getByText("Alice")).toBeVisible();

        ////////////////////////// Now, let's test in Livekit /////////////////////////

        // Mallory joins the meeting
        await using userMallory = await getPage(
            browser,
            "Mallory",
            publicTestMapUrl("tests/E2E/empty.json", "screensharing"),
        );
        await Map.teleportToPosition(userMallory, 160, 160);

        // Mallory sees Alice screen-sharing in big (screen-sharing is forwarded from Livekit)
        await expect(userMallory.locator("#highlighted-media").getByText("Alice")).toBeVisible();

        ////////////////////////// Now, Alice loses her connection to the LiveKit server /////////////////////////
        // This is the "No video stream received" report: a short outage on the user's side, long enough for
        // livekit-client to give up reconnecting, while the WorkAdventure WebSocket stays up.

        // The space cannot flip back to WebRTC during the outage: the back counts users through the WorkAdventure
        // WebSocket, which stays up.
        await expectLivekitConnectionsCountToBe(userAlice, 3, 30_000);
        await expectLivekitConnectionsCountToBe(userBob, 3, 30_000);

        const livekitGaveUp = aliceLivekitOutage.waitForLivekitToGiveUp();
        await aliceLivekitOutage.block();
        await livekitGaveUp;

        // The dead room is torn down (the old code kept it, with its stale participants, forever), the server
        // dropped Alice: everyone lost her participant and her screen share
        await expectLivekitConnectionsCountToBe(userAlice, 0, 30_000);
        await expectLivekitConnectionsCountToBe(userBob, 2, 30_000);
        await expect(userBob.locator("#highlighted-media").getByText("Alice")).toBeHidden({ timeout: 30_000 });

        // The network comes back: Alice gets a fresh invitation, rejoins and her screen share is published again.
        // Without the fix, Alice never rejoins and the others keep a tile of her with "No video stream received".
        await aliceLivekitOutage.restore();
        await expectLivekitConnectionsCountToBe(userAlice, 3, 60_000);
        await expectLivekitConnectionsCountToBe(userBob, 3, 60_000);
        await Menu.expectButtonState(userAlice, "screenShareButton", "active");
        await expect(userAlice.locator("#cameras-container").getByText("You")).toHaveCount(2);
        await expect(userBob.locator("#highlighted-media").getByText("Alice")).toBeVisible({ timeout: 30_000 });
        await expect(userMallory.locator("#highlighted-media").getByText("Alice")).toBeVisible({ timeout: 30_000 });
        await expect(userBob.getByText("No video stream received")).toBeHidden();
        await expect(userMallory.getByText("No video stream received")).toBeHidden();
    });
});
