import {expect, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import Chat from './utils/chat';
import {expectInViewport, expectOutViewport} from "./utils/viewport";
import Map from './utils/map';

test.describe('Scripting chat functions', () => {
    test('can open / close chat', async ({ page}) => {
        await page.goto(
            'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
        );

        await login(page);

        await expectOutViewport("#chatWindow", page);

        // Test open chat scripting
        await evaluateScript(page, async () => {
            return WA.chat.open();
        });
        await expectInViewport("#chatWindow", page);

        // Open the time line
        await Chat.openTimeline(page);
        await expect(page.frameLocator('iframe#chatWorkAdventure').locator('aside.chatWindow')).toBeVisible();

        // Test send message scripting
        await evaluateScript(page, async () => {
            return WA.chat.sendChatMessage('Test message sent', 'Test machine');
        });
        await expect(
                page.frameLocator('iframe#chatWorkAdventure')
                .locator('aside.chatWindow')
                .locator(".wa-message-body")
        ).toContainText('Test message sent');
        await expect(
            page.frameLocator('iframe#chatWorkAdventure')
            .locator('aside.chatWindow')
            .locator("#timeLine-messageList")
        ).toContainText('Test machine');

        // Test close chat scripting
        await evaluateScript(page, async () => {
            return WA.chat.close();
        });
        await expectOutViewport("#chatWindow", page);
    });

    test('can send message to bubble users', async ({ page, browser}) => {
        await page.goto(
            'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
        );

        await login(page);
        await Map.walkToPosition(page, 32, 32);

        const newBrowser = await browser.browserType().launch();
        const page2 = await newBrowser.newPage();
        await page2.goto('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json');


        await evaluateScript(page, async () => {
            WA.player.proximityMeeting.onJoin().subscribe((user) => {
                console.log("Entering proximity meeting with", user);
                //setTimeout(() => {
                    WA.chat.sendChatMessage('Test message sent', {
                        scope: 'bubble',
                    });
                //}, 5000);
            });
        });

        await login(page2);

        const promise = evaluateScript(page2, async () => {
            return new Promise((resolve) => {
                WA.chat.onChatMessage((message, event) => {
                    resolve(message);
                }, {
                    scope: "bubble",
                });
            });
        });


        await Map.walkToPosition(page2, 32, 32);

        await promise;

    });
});
