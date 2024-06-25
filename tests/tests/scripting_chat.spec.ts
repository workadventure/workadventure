import { expect, test, webkit } from "@playwright/test";
import Map from "./utils/map";
import { evaluateScript } from "./utils/scripting";
import { login } from "./utils/roles";
import { publicTestMapUrl } from "./utils/urls";
import { expectInViewport, expectOutViewport } from "./utils/viewport";
import Chat from "./utils/chat";

//TODO update tests for new proximity chat !
test.describe("Scripting chat functions", () => {
  test('can open / close chat + start / stop typing @chat', async ({ page}, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechromium") {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
    }
    await page.goto(
        publicTestMapUrl("tests/E2E/empty.json", "scripting_chat")
    );

    await login(page);

    // Test open chat scripting
    await expect(page.locator('#chat')).toBeHidden();
    await evaluateScript(page, async () => {
        return WA.chat.open();
    });
    await expect(page.locator('#chat')).toBeVisible();

    // Open the time line
    await Chat.openTimeline(page);
    await expect(page.locator('.back-roomlist')).toBeVisible();

    // Test send message scripting
    await evaluateScript(page, async () => {
        return WA.chat.sendChatMessage('Test message sent', 'Test machine');
    });

    await expect(
      page.locator('#chat')
      .locator('#message')
    ).toContainText('Test message sent');

    await expect(
      page.locator('#chat')
      .locator('#message')
      .locator(".messageHeader")
    ).toContainText('Test machine');

    /*
    // Test start typing
    await evaluateScript(page, async () => {
        return WA.chat.startTyping({
            scope: "local",
            author: "Eve",
        });
    });
    await expect(page.frameLocator('iframe[title="WorkAdventureChat"]').getByText('Eve', { exact: true })).toBeVisible();
    // Test stop typing
    await evaluateScript(page, async () => {
        return WA.chat.stopTyping({
            scope: "local",
            author: "Eve",
        });
    });
    await expect.poll(() => page.frameLocator('iframe[title="WorkAdventureChat"]').getByText('Eve', { exact: true }).count()).toBe(0);
    */
    // Test close chat scripting
    await evaluateScript(page, async () => {
        return WA.chat.close();
    });
    await expect(page.locator('#chat')).toBeHidden();
  });
  /*test('can send message to bubble users @chat', async ({ page, browser}, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechromium") {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
    }
    // It seems WebRTC fails to start on Webkit
    if(browser.browserType() === webkit) {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
    }
    await page.goto(
        publicTestMapUrl("tests/E2E/empty.json", "scripting_chat")
    );
    await login(page);
    await Map.teleportToPosition(page, 32, 32);
    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();
    await page2.goto(publicTestMapUrl("tests/E2E/empty.json", "scripting_chat"));
    await evaluateScript(page, async () => {
        WA.player.proximityMeeting.onJoin().subscribe((user) => {
            console.log("Entering proximity meeting with", user);
            WA.chat.sendChatMessage('Test message sent', {
                scope: 'bubble',
            });
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
    // Wait for the onChatMessage to be registered
    await new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, 500);
    });
    await Map.teleportToPosition(page2, 32, 32);
    await promise;
    await evaluateScript(page, async () => {
        WA.chat.startTyping({
            scope: 'bubble',
        });
    });
    await expect(page2.frameLocator('iframe[title="WorkAdventureChat"]').locator('.loading-group')).toBeVisible();
    await evaluateScript(page, async () => {
        WA.chat.stopTyping({
            scope: 'bubble',
        });
    });
    await expect.poll(() => page2.frameLocator('iframe[title="WorkAdventureChat"]').locator('.loading-group').count()).toBe(0);
  });*/
});
