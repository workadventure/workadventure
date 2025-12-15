import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import {
    expectWebRtcConnectionsCountToBe,
    expectLivekitConnectionsCountToBe,
    triggerWebRtcRetryAndVerifyReconnection,
    triggerLivekitRetryAndVerifyReconnection,
} from "./utils/webRtc";

test.setTimeout(180_000);

test.describe("WebRTC/LiveKit Reconnection @nomobile @nowebkit", () => {
    test.beforeEach("Skip on mobile and webkit", ({ browserName, page, browser }) => {
        if (browserName === "webkit" || isMobile(page) || browser.browserType().name() === "firefox") {
            test.skip();
            return;
        }
    });

    test("Should reconnect WebRTC peer after multiple forced failures with verified disconnections", async ({ browser }) => {
        // Given: 2 users in a meeting (WebRTC mode - less than 4 users)
        await using page = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "webrtc-retry"));
        await using userBob = await getPage(
            browser,
            "Bob",
            publicTestMapUrl("tests/E2E/empty.json", "webrtc-retry")
        );

        // Move both users to the same position to trigger WebRTC meeting
        await Map.teleportToPosition(page, 160, 160);
        await Map.teleportToPosition(userBob, 160, 160);

        // Wait for cameras to be visible
        await expect(page.locator("#cameras-container")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });

        // Verify initial WebRTC connection
        await expectWebRtcConnectionsCountToBe(page, 1);
        await expectWebRtcConnectionsCountToBe(userBob, 1);

        // When: Force multiple failures in sequence, verifying disconnection each time
        // If it works 3 times, it works 1 time - this covers both single and multiple retry scenarios
        for (let i = 0; i < 3; i++) {
            const { disconnectionObserved, result } = await triggerWebRtcRetryAndVerifyReconnection(page);

            // Verify each iteration had a proper disconnection (count went to 0 then back to 1)
            expect(result).not.toBeNull();
            expect(result?.triggered).toBe(true);
            expect(disconnectionObserved).toBe(true);

            // Small delay between retries to let the connection stabilize
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 2000);
            });
        }

        // Then: Connection should still be stable after multiple retries
        await expectWebRtcConnectionsCountToBe(page, 1);
        await expectWebRtcConnectionsCountToBe(userBob, 1, 60_000);

        // And: Both users should still see each other
        await expect(page.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });
        await expect(userBob.locator("#cameras-container").getByText("Alice")).toBeVisible({ timeout: 30_000 });

        // Clean up
        await page.close();
        await userBob.close();
        await page.context().close();
        await userBob.context().close();
    });

    test("should reconnect LiveKit after WebSocket close", async ({ browser }) => {
        // This test is unreliable across environments and should be stabilized before re-enabling.
        test.skip(true);
        // Given: 5 users in a meeting (LiveKit mode - more than 4 users)
        await using page = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/E2E/empty.json", "livekit-retry")
        );
        await using userBob = await getPage(
            browser,
            "Bob",
            publicTestMapUrl("tests/E2E/empty.json", "livekit-retry")
        );
        await using userEve = await getPage(
            browser,
            "Eve",
            publicTestMapUrl("tests/E2E/empty.json", "livekit-retry")
        );
        await using userMallory = await getPage(
            browser,
            "Mallory",
            publicTestMapUrl("tests/E2E/empty.json", "livekit-retry")
        );
        await using userJohn = await getPage(
            browser,
            "John",
            publicTestMapUrl("tests/E2E/empty.json", "livekit-retry")
        );

        // Move all users to the same position to trigger LiveKit
        await Map.teleportToPosition(page, 160, 160);
        await Map.teleportToPosition(userBob, 160, 160);
        await Map.teleportToPosition(userEve, 160, 160);
        await Map.teleportToPosition(userMallory, 160, 160);
        await Map.teleportToPosition(userJohn, 160, 160);

        // Wait for cameras container and verify LiveKit mode
        await expect(page.locator("#cameras-container")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("#cameras-container .camera-box")).toHaveCount(5, { timeout: 30_000 });

        // Verify we're in LiveKit mode (4 connections for 5 users)
        await expectLivekitConnectionsCountToBe(page, 4);
        await expectWebRtcConnectionsCountToBe(page, 0);

        // When: Force LiveKit WebSocket close on Alice's side and verify disconnection/reconnection
        const { disconnectionObserved, result } = await triggerLivekitRetryAndVerifyReconnection(page, 4);

        // Then: Verify disconnection was observed (count dropped below initial)
        expect(result).not.toBeNull();
        expect(result?.closed).toBe(true);
        expect(disconnectionObserved).toBe(true);

        // And: All users should still be visible
        await expect(page.locator("#cameras-container .camera-box")).toHaveCount(5, { timeout: 30_000 });
        await expect(page.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("#cameras-container").getByText("Eve")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("#cameras-container").getByText("Mallory")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("#cameras-container").getByText("John")).toBeVisible({ timeout: 30_000 });

        // Clean up
        await page.close();
        await userBob.close();
        await userEve.close();
        await userMallory.close();
        await userJohn.close();
        await page.context().close();
        await userBob.context().close();
        await userEve.context().close();
        await userMallory.context().close();
        await userJohn.context().close();
    });

});
