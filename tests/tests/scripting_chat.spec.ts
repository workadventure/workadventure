import { expect, test, webkit } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import { login } from "./utils/roles";
import { publicTestMapUrl } from "./utils/urls";
import Chat from "./utils/chat";
import Map from "./utils/map";

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

    await login(page, "Alice", 2, "en-US", project.name === "mobilechromium");

    // Test open chat scripting
    await expect(page.locator('#chat')).toBeHidden();

    await evaluateScript(page, async () => {
        return WA.chat.open();
    });
    await expect(page.locator('#chat')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Proximity Chat'})).toBeVisible({ timeout: 60000 });

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

    // Test start typing
    await evaluateScript(page, async () => {
        return WA.chat.startTyping({
            scope: "local",
            author: "Eve",
        });
    });
    await expect(
      page.locator('#chat')
      .locator(`#typing-user-${btoa("Eve")}`)
    ).toBeVisible();

    // Test stop typing
    await evaluateScript(page, async () => {
        return WA.chat.stopTyping({
            scope: "local",
            author: "Eve",
        });
    });
    await expect(
      page.locator('#chat')
      .locator(`#typing-user-${btoa("Eve")}`)
    ).toBeHidden();

    // Test close chat scripting
    await evaluateScript(page, async () => {
        return WA.chat.close();
    });
    await expect(page.locator('#chat')).toBeHidden();
  });

  test('can send message to bubble users @chat', async ({ page, browser}, { project }) => {
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

    const bob = page;
    await bob.goto(
      publicTestMapUrl("tests/E2E/empty.json", "scripting_chat")
    );
    await login(bob, "bob", 3, "en-US", project.name === "mobilechromium");

    // test to send bubblme message when entering proximity meeting
    await evaluateScript(bob, async () => {
      WA.player.proximityMeeting.onJoin().subscribe((user) => {
          console.log("Entering proximity meeting with", user);
          WA.chat.sendChatMessage('Test message sent', {
              scope: 'bubble',
              author: "Test"
          });
      });
    });

    // Move bob to the position 32, 32
    await Map.teleportToPosition(bob, 32, 32);

    // Open new page for alice
    const newBrowser = await browser.browserType().launch();
    const alice = await newBrowser.newPage();
    await alice.goto(publicTestMapUrl("tests/E2E/empty.json", "scripting_chat"));
    await login(alice, "Alice", 2, "en-US", project.name === "mobilechromium");

    // Open the chat and wait the matrix connection to be established
    await Chat.open(alice, false);
    await expect(alice.locator('#chat')).toBeVisible();
    await expect(alice.getByRole('button', {name: 'Proximity Chat'})).toBeVisible({ timeout: 30000 });

    // Move alice to the same position as bob
    await Map.teleportToPosition(alice, 32, 32);

    // Check that bob received the message
    await expect(
      bob.locator('#chat')
      .locator('#message')
      .nth(0)
    ).toContainText('Alice join the discussion', { timeout: 30000 });

    // Check that bob received the message
    await expect(
      bob.locator('#chat')
      .locator('#message')
      .nth(1)
    ).toContainText('Test message sent', { timeout: 30000 });

    // TODO: Check that alice also received the message
    // Check that bob received the message
    await expect(
      alice.locator('#chat')
      .locator('#message')
      .nth(0)
    ).toContainText('bob join the discussion', { timeout: 30000 });

    // Check that alice also received the message
    await expect(
      alice.locator('#chat')
      .locator('#message')
      .nth(1)
    ).toContainText('Test message sent', { timeout: 30000 });
  });
});
