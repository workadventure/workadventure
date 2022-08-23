import {expect, Page, test} from '@playwright/test';
import { login } from './utils/roles';
import {openChat} from "./utils/menu";
import {findContainer, startContainer, stopContainer} from "./utils/containers";

const TIMEOUT_TO_GET_LIST = 30_000;

test.setTimeout(240_000);

test.describe('Chat', () => {
  test('main', async ({ page, browser }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/livezone.json'
    );
    const nickname = getUniqueNickname('A');
    await login(page, nickname, 2);
    await openChat(page);
    const ejabberd = await findContainer('ejabberd');

    await test.step('all tests of chat', async () => {
      await checkNameInChat(page, nickname);
      const chat = page.frameLocator('iframe#chatWorkAdventure').locator('aside.chatWindow');


      // Second browser
      const newBrowser = await browser.browserType().launch();
      const page2 = await newBrowser.newPage();
      await page2.goto(
          'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/livezone.json'
      );
      const nickname2 = getUniqueNickname('B');
      await login(page2, nickname2, 3);
      await openChat(page2);
      const chat2 = page2.frameLocator('iframe#chatWorkAdventure').locator('aside.chatWindow');
      await checkNameInChat(page2, nickname);
      await checkNameInChat(page2, nickname2);


      // Enter in liveZone
      await page.keyboard.press('ArrowRight', {delay: 2_500});
      await page.keyboard.press('ArrowUp', {delay: 500});
      await expect(chat.locator('#liveRooms')).toContainText('liveZone');
      await page2.keyboard.press('ArrowRight', {delay: 2_500});
      await page2.keyboard.press('ArrowDown', {delay: 500});
      await expect(chat2.locator('#liveRooms')).toContainText('liveZone');


      // Open forum
      await chat.locator('#liveRooms .wa-chat-item .wa-dropdown button').click();
      await chat.locator('#liveRooms .wa-chat-item .wa-dropdown .open').click();
      await chat2.locator('#liveRooms .wa-chat-item .wa-dropdown button').click();
      await chat2.locator('#liveRooms .wa-chat-item .wa-dropdown .open').click();


      // Send a message
      await chat.locator('#activeThread .wa-message-form textarea').fill('Hello, how are you ?');
      await chat.locator('#activeThread #send').click();
      await expect(chat.locator('#activeThread .wa-messages-list .wa-message').last()).toHaveClass(/sent/);
      // Receive the message
      await expect(chat2.locator('#activeThread .wa-messages-list .wa-message.received').last()).toContainText('Hello, how are you ?');


      // React to a message
      await chat2.locator('#activeThread .wa-messages-list .wa-message.received').last().hover();
      await chat2.locator('#activeThread .wa-messages-list .wa-message.received').last().locator('.actions .action.react').click();
      await page2.frameLocator('iframe#chatWorkAdventure').locator('.emoji-picker .emoji-picker__emojis button.emoji-picker__emoji').first().click();
      await expect(chat2.locator('#activeThread .wa-messages-list .wa-message.received').last().locator('.emojis span.active')).toBeDefined();
      // Receive the reaction
      await expect(chat.locator('#activeThread .wa-messages-list .wa-message.sent').last().locator('.emojis span')).toBeDefined();


      // Reply to a message
      await chat2.locator('#activeThread .wa-messages-list .wa-message.received').last().hover();
      await chat2.locator('#activeThread .wa-messages-list .wa-message.received').last().locator('.actions .action.reply').click();
      await expect(chat2.locator('#activeThread .wa-message-form .replyMessage .message p')).toContainText('Hello, how are you ?');
      await chat2.locator('#activeThread .wa-message-form textarea').fill('Fine, what about you ?');
      await chat2.locator('#activeThread #send').click();
      await expect(chat2.locator('#activeThread .wa-messages-list .wa-message').last()).toHaveClass(/sent/);
      // Receive the reply of the message
      await expect(chat.locator('#activeThread .wa-messages-list .wa-message.received').last()).toContainText('Fine, what about you ?');
      await expect(chat.locator('#activeThread .wa-messages-list .wa-message.received').last().locator('.message-replied')).toContainText('Hello, how are you ?');


      // Send a file in a message
      await chat.locator('#activeThread input#file').setInputFiles('README.md');
      await expect(chat.locator('#activeThread #send')).toHaveClass(/can-send/);
      await chat.locator('#activeThread #send').click();
      await expect(chat.locator('#activeThread .wa-messages-list .wa-message').last()).toHaveClass(/sent/);
      await expect(chat.locator('#activeThread .wa-messages-list .wa-message').last().locator('.file')).toContainText('README.md');
      // Receive the file
      //await expect(chat2.locator('#activeThread .wa-messages-list .wa-message').last()).toHaveClass(/received/);
      //await expect(chat2.locator('#activeThread .wa-messages-list .wa-message').last().locator('.file')).toContainText('README.md');

      await chat.locator('#activeThread #settings').click();
      // Rank up user
      await chat.locator('#activeThread .users .wa-chat-item.user').first().locator('.wa-dropdown button').click();
      await chat.locator('#activeThread .users .wa-chat-item.user').first().locator('.wa-dropdown .rank-up').click();
      await expect(chat.locator('#activeThread .users .wa-chat-item').last()).toHaveClass(/admin/);
      // Rank down user
      await chat.locator('#activeThread .users .wa-chat-item.admin').last().locator('.wa-dropdown button').click();
      await chat.locator('#activeThread .users .wa-chat-item.admin').last().locator('.wa-dropdown .rank-down').click();
      await expect(chat.locator('#activeThread .users .wa-chat-item').last()).toHaveClass(/user/);
      /*
      // TODO later : Ban a user
      await chat.locator('#activeThread .users .wa-chat-item.user').last().locator('.wa-dropdown button').click();
      await chat.locator('#activeThread .users .wa-chat-item.user').last().locator('.wa-dropdown .ban').click();
      await expect(chat.locator('#activeThread .users')).not.toContainText(nickname2);
      */

      // Exit forum
      await chat.locator('#activeThread #exit').click();


      // Walk to
      await chat.locator('.users .wa-chat-item.user').last().locator('.wa-dropdown button').click();
      await chat.locator('.users .wa-chat-item.user').last().locator('.wa-dropdown .walk-to').click();
      // Open timeline
      await chat.locator('#timeline #openTimeline').click();
      await expect(chat.locator('#activeTimeline #timeLine-messageList .event').last()).toContainText(nickname2 + ' join the discussion');
      // Close timeline
      await chat.locator('#activeTimeline #exit').click();


      // Exit of liveZone
      await page.locator('#game').focus();
      await page.keyboard.press('ArrowLeft', {delay: 2_000});
      await expect(chat).not.toContain('#liveRooms');
    });

    await test.step('disconnect and reconnect to ejabberd and pusher', async () => {
      const chat = page.frameLocator('iframe#chatWorkAdventure').locator('aside.chatWindow');
      await checkNameInChat(page, nickname);

      await stopContainer(ejabberd);
      await expect(chat).toContainText("Connection to presence server");
      await startContainer(ejabberd);
      await checkNameInChat(page, nickname);

      const pusher = await findContainer('pusher');
      await stopContainer(pusher);
      await expect(page.locator('.errorScreen p.code')).toContainText('CONNECTION_');

      await startContainer(pusher);
      await checkNameInChat(page, nickname);
    });
  });
});

async function checkNameInChat(page: Page, name: string){
  await expect(page.frameLocator('iframe#chatWorkAdventure').locator('aside.chatWindow div.users')).toContainText(name, {timeout: TIMEOUT_TO_GET_LIST});
}

function getUniqueNickname(name: string){
  return `${name}_${Date.now().toString().split("").reverse().join("")}`.substring(0, 8);
}
