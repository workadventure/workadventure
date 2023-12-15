import {expect, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import {RENDERER_MODE} from "./utils/environment";

test.describe('Scripting API Events', () => {
    test('test events', async ({ page, browser, request }) => {
        // Go to 
        await page.goto(
            `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
        );
        await login(page, "Alice");

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

            WA.event.broadcast("key", "value");
            await promise;
            return true;
        });
        expect(eventTriggered).toBeTruthy();

        // 2. Connect 2 users and check that the events are triggered on the other user (using broadcast events)
        const newBrowser = await browser.browserType().launch();
        const page2 = await newBrowser.newPage();

        await page2.goto(
            `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
        );

        await login(page2, 'Bob');


        let gotExpectedBroadcastNotification = false;
        let gotExpectedTargetedNotification = false;
        let gotExpectedGlobalNotification = false;
        page.on('console', async (msg) => {
            const text = await msg.text();
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
            WA.event.broadcast("key2", "value");
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

        const result = await request.post("http://play.workadventure.localhost/global/event", {
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
    });
});