import {expect, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";

test.describe('Scripting API Events', () => {
    test('test global events', async ({ page, browser }) => {
        // Go to 
        await page.goto(
            'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
        );
        await login(page, "Alice");

        // 1. Test that the event is triggered locally
        const eventTriggered = await evaluateScript(page, async () => {
            let eventTriggered = false;
            await WA.onInit();
            WA.event.onEventTriggered("key").subscribe((event) => {
                if (event.key !== "key") {
                    return;
                }
                if (event.value !== "value") {
                    return;
                }
                if (event.senderId !== WA.player.playerId) {
                    return;
                }

                eventTriggered = true;
            });

            WA.event.dispatchEvent("key", "value");
            return eventTriggered;
        });
        expect(eventTriggered).toBeTruthy();

        // 2. Connect 2 users and check that the events are triggered on the other user
        const newBrowser = await browser.browserType().launch();
        const page2 = await newBrowser.newPage();

        await page2.goto(
            'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
        );

        await login(page2, 'Bob');


        let gotExpectedNotification = false;
        page.on('console', async (msg) => {
            const text = await msg.text();
            //console.log(text);
            if (text === 'Event triggered') {
                gotExpectedNotification = true;
            }
        });

        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.event.onEventTriggered("key2").subscribe((event) => {
                if (event.key !== "key2") {
                    return;
                }
                if (event.value !== "value") {
                    return;
                }
                if (event.senderId !== WA.player.playerId) {
                    return;
                }

                console.log("Event triggered");
            });
        });

        await evaluateScript(page2, async () => {
            await WA.onInit();
            WA.event.dispatchEvent("key2", "value");
        });

        await expect.poll(() => gotExpectedNotification).toBe(true);

    });
});