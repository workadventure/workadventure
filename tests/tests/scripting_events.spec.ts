import {expect, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";

test.describe('Scripting API Events', () => {
    test('test global events', async ({ page }) => {
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


    });
});