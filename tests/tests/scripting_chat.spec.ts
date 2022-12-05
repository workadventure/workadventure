import {expect, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import Chat from './utils/chat';
import {expectInViewport, expectOutViewport} from "./utils/viewport";

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
});
