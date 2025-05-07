import { expect, test } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import Chat from "./utils/chat";
import Map from "./utils/map";
import { resetWamMaps } from "./utils/map-editor/uploader";
import chatUtils from "./chat/chatUtils";
import { getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.describe("#Scripting chat functions", () => {
  test.beforeEach(
    "Ignore tests on webkit because of issue with camera and microphone",

    async ({ browserName, request, page }) => {
      //WebKit has issue with camera
      if (browserName === "webkit" || isMobile(page)) {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
      }
      await resetWamMaps(request);
      await chatUtils.resetMatrixDatabase();
    }
  );
  test("can open / close chat + start / stop typing @chat", async ({
    browser
  }) => {
    const page = await getPage(browser, "Bob", Map.url("empty"));
    //await oidcMatrixUserLogin(page, false);

    // Test open chat scripting
    await expect(page.locator("#chat")).toBeHidden();

    await evaluateScript(page, async () => {
      return WA.chat.open();
    });
    await expect(page.locator("#chat")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Proximity Chat" })
    ).toBeVisible({ timeout: 60000 });

    // Open the timeline
    await Chat.openTimeline(page);
    await expect(page.locator(".back-roomlist")).toBeVisible();

    // Test send message scripting
    await evaluateScript(page, async () => {
      return WA.chat.sendChatMessage("Test message sent", "Test machine");
    });

    await expect(page.locator("#chat").locator(".messageContainer")).toContainText(
      "Test message sent"
    );

    await expect(
      page.locator("#chat").locator(".messageContainer").locator(".messageHeader")
    ).toContainText("Test machine");

    // Test start typing
    await evaluateScript(page, async () => {
      return WA.chat.startTyping({
        scope: "local",
        author: "Eve",
      });
    });
    await expect(
      page.locator("#chat").locator(`#typing-user-${btoa("Eve")}`)
    ).toBeVisible();

    // Test stop typing
    await evaluateScript(page, async () => {
      return WA.chat.stopTyping({
        scope: "local",
        author: "Eve",
      });
    });
    await expect(
      page.locator("#chat").locator(`#typing-user-${btoa("Eve")}`)
    ).toBeHidden();

    // Test close chat scripting
    await evaluateScript(page, async () => {
      return WA.chat.close();
    });
    await expect(page.locator("#chat")).toBeHidden();

    await page.close();
    await page.context().close();
  });

  test("can send message to bubble users @chat", async ({ browser }) => {
    const bob = await getPage(browser, "Bob", Map.url("empty"));
    //await oidcMatrixUserLogin(bob, false);
    // test to send bubble message when entering proximity meeting
    await evaluateScript(bob, async () => {
      WA.player.proximityMeeting.onJoin().subscribe((user) => {
        console.log("Entering proximity meeting with", user);
        // Let's wait a bit to be sure the "bob entered the meeting" message is sent first
        setTimeout(() => {
          WA.chat.sendChatMessage("Test message sent", {
            scope: "bubble",
          });
        }, 200);
      });
    });

    // Move bob to the position 32, 32
    await Map.teleportToPosition(bob, 32, 32);

    // Open new page for alice
    const alice = await getPage(browser, "Alice", Map.url("empty"));
    //await oidcMemberTagLogin(alice, false);

    const chatMessageReceivedPromise = evaluateScript(alice, async () => {
      await WA.players.configureTracking();

      return new Promise((resolve) => {
        WA.chat.onChatMessage(
          (message, event) => {
            resolve({
              message,
              event,
            });
          },
          {
            scope: "bubble",
          }
        );
      });
    });
    //await alice.waitForTimeout(200);

    // Move alice to the same position as bob
    await Map.teleportToPosition(alice, 32, 32);

    // Check that bob received the message
    //await bob.pause();
    await expect(bob.getByText('Alice joined the discussion')).toBeVisible();

    // Check that bob received the message
    await expect(bob.locator("#chat")).toContainText("Test message sent", {
      timeout: 30000,
    });

    // Check that bob received the message
    await expect(alice.getByText('Bob joined the discussion')).toBeVisible();

    // Check that alice also received the message
    await expect(alice.locator("#chat")).toContainText("Test message sent", {
      timeout: 30000,
    });

    const chatMessageReceived = await chatMessageReceivedPromise;
    expect(chatMessageReceived.message).toBe("Test message sent");
    expect(chatMessageReceived.event.authorId).toBeDefined();
    expect(chatMessageReceived.event.author).toBeDefined();
    await alice.close();
    await alice.context().close();
    await bob.close();
    await bob.context().close();
  });
});