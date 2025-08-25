import {expect, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from "./utils/auth"
import {isMobile} from "./utils/isMobile";

test.describe('Scripting API Events @nomobile', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(isMobile(page), 'Skip on mobile devices');
    });
    test('events', async ({ browser, request }) => {
        // Go to
        await using page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_events"));

        // 1. Test that the event is triggered locally
        const eventTriggered = await evaluateScript(page, async () => {
            await WA.onInit().then(() => {
                console.log("WA.player.playerId", WA.player.playerId);

            });
            const promise = new Promise<void>((resolve, reject) => {
                WA.event.on("key").subscribe((event) => {
                    if (event.name !== "key") {
                        reject(new Error("Invalid event key"));
                        return;
                    }
                    if (event.data !== "value") {
                        reject(new Error("Invalid event value"));
                        return;
                    }
                    if (event.senderId !== WA.player.playerId) {
                        reject(new Error("Invalid event senderId"));
                        return;
                    }
                    resolve();
                });
            });
            await WA.event.broadcast("key", "value");
            await promise;
            return true;
        });
        expect(eventTriggered).toBeTruthy();

        // 2. Connect 2 users and check that the events are triggered on the other user (using broadcast events)
        await using page2 = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "scripting_events"));

        let gotExpectedBroadcastNotification = false;
        let gotExpectedTargetedNotification = false;
        let gotExpectedGlobalNotification = false;
        page.on('console', async (msg) => {
            const text = msg.text();
            //console.log(text);
            if (text === 'Broadcast event triggered') {
                gotExpectedBroadcastNotification = true;
            }
            if (text === 'Targeted event triggered') {
                gotExpectedTargetedNotification = true;
            }
            if (text === 'Global event triggered') {
                gotExpectedGlobalNotification = true;
            }
        });
        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.event.on("key2").subscribe((event) => {
                if (event.name !== "key2") {
                    return;
                }
                if (event.data !== "value") {
                    return;
                }
                if (event.senderId === WA.player.playerId) {
                    return;
                }

                console.log("Broadcast event triggered");
            });
        });

        await evaluateScript(page2, async () => {
            await WA.onInit();
            await WA.event.broadcast("key2", "value");
        });
        await expect.poll(() => gotExpectedBroadcastNotification).toBe(true);

        // 3. Connect 2 users and check that the events are triggered on the other user (using targeted events)
        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.event.on("key3").subscribe((event) => {
                if (event.name !== "key3") {
                    return;
                }
                if (event.data !== "value") {
                    return;
                }
                if (event.senderId === WA.player.playerId) {
                    return;
                }

                console.log("Targeted event triggered");
            });
        });
        await evaluateScript(page2, async () => {
            await WA.onInit();
            await WA.players.configureTracking({
                players: true,
                movement: false,
            });
            for (const player of WA.players.list()) {
                player.sendEvent("key3", "value");
            }
        });
        await expect.poll(() => gotExpectedTargetedNotification).toBe(true);

        // 4. Test that sending event through the global /global/event API on the pusher works
        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.event.on("key4").subscribe((event) => {
                if (event.name !== "key4") {
                    return;
                }
                if (event.data !== "value") {
                    return;
                }
                console.log("Global event triggered");
            });
        });
        const result = await request.post("/global/event", {
            headers: {
                "Authorization": process.env.ADMIN_API_TOKEN,
            },
            data: {
                name: "key4",
                data: "value",
            }
        });
        expect(result.status()).toBe(200);
        expect(await result.text()).toEqual("ok");

        await expect.poll(() => gotExpectedGlobalNotification).toBe(true);

        await page2.context().close();

        await page.context().close();
    });
});
