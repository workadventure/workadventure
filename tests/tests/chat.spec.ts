import {expect, test} from '@playwright/test';
import {hideNoCamera, login} from './utils/roles';
import Chat from './utils/chat';
import Map from './utils/map';
import {findContainer, startContainer, stopContainer} from "./utils/containers";
import {createFileOfSize, deleteFile, fileExist} from "./utils/file";
import Menu from "./utils/menu";

const TIMEOUT_TO_GET_LIST = 60_000;

test.setTimeout(750_000);

test.describe('Chat', () => {
  test('main', async ({ page, browser, browserName }) => {
    /*page.on('console', msg => console.log(browserName + ' - ' + msg.type() + ' - ' + msg.text()));
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log('>>', response.status(), response.url());
      }
    });*/


    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/livezone.json'
    );
    const nickname = getUniqueNickname('A');
    await login(page, nickname, 2);

    if(browserName === "webkit"){
      // Because webkit in playwright does not support Camera/Microphone Permission by settings
      await hideNoCamera(page);
    }

    await Menu.openChat(page);
    const ejabberd = await findContainer('ejabberd');

    await test.step('all tests of chat', async () => {
      await Chat.slideToUsers(page);
      await Chat.checkNameInChat(page, nickname, TIMEOUT_TO_GET_LIST);

      // Second browser
      const newBrowser = await browser.browserType().launch();
      const page2 = await newBrowser.newPage();
      await page2.goto(
          'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/livezone.json'
      );
      const nickname2 = getUniqueNickname('B');
      await login(page2, nickname2, 3);

      if(browserName === "webkit"){
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await hideNoCamera(page2);
      }
      
      await Menu.openChat(page2);
      await Chat.slideToUsers(page2);
      await Chat.checkNameInChat(page2, nickname, TIMEOUT_TO_GET_LIST);
      await Chat.checkNameInChat(page2, nickname2, TIMEOUT_TO_GET_LIST);

      // Enter in liveZone
      await Chat.slideToChat(page);
      await page.locator('#game canvas').click();
      await Map.rightClickToPosition(page, 580, 70);
      await Chat.chatZoneExist(page, 'liveZone');

      await Chat.slideToChat(page2);
      await page2.locator('#game canvas').click();
      await Map.rightClickToPosition(page2, 580, 200);
      await Chat.chatZoneExist(page2, 'liveZone');


      // Open forum
      await Chat.openChatZone(page);
      await Chat.openChatZone(page2);


      // Send a message
      await Chat.AT_sendMessage(page, 'Hello, how are you ?');
      await Chat.AT_checkLastMessageSent(page);
      // Receive the message
      await Chat.AT_lastMessageContain(page2, 'Hello, how are you ?');


      // React to a message
      await Chat.AT_reactLastMessage(page2);
      // Receive the reaction
      await Chat.AT_checkReactLastMessageReceived(page);


      // Reply to a message
      await Chat.AT_replyToLastMessage(page2, 'Fine, what about you ?');
      // Receive the reply of the message
      await Chat.AT_lastMessageContain(page, 'Fine, what about you ?');
      await Chat.AT_lastMessageReplyContain(page, 'Hello, how are you ?');


      // Generate bulk file
      await createFileOfSize('./fileLittle.txt', 5_000_000);
      // Send a file in a message
      await Chat.AT_uploadFile(page, 'fileLittle.txt');
      await Chat.AT_canSend(page);
      await Chat.AT_send(page);
      await Chat.AT_checkLastMessageSent(page);
      await Chat.AT_lastMessageFileContain(page, 'fileLittle.txt');
      // Receive the file
      await Chat.AT_checkLastMessageReceived(page2);
      await Chat.AT_lastMessageFileContain(page2, 'fileLittle.txt');

      // Generate bulk file
      await createFileOfSize('./fileBig.txt', 15_485_760);
      // Try upload file but too big
      await Chat.AT_uploadFile(page, 'fileBig.txt');
      await Chat.AT_cantSend(page);
      await Chat.AT_fileContainText(page, 'fileBig.txt is too big');
      await Chat.AT_deleteFile(page);

      /*
      // TODO later : Manage admin in live zone based on our WorkAdventure role
      await chat.locator('#activeThread #settings').click();
      // Rank up user
      // Workaround to wait the end of svelte animation
      //eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(3_000);
      await chat.locator('#activeThread .users .wa-chat-item', {hasText: nickname2}).locator('.wa-dropdown button').click();
      //await expect(chat.locator('.users .wa-chat-item', {hasText: nickname2}).locator('.wa-dropdown .wa-dropdown-menu')).toBeVisible();
      //await chat.locator('#activeThread .users .wa-chat-item', {hasText: nickname2}).locator('.wa-dropdown .rank-up').click();
      await chat.locator('span:has-text("Promote")').click({ timeout: 5_000 });
      await expect(chat.locator('#activeThread .users .wa-chat-item', {hasText: nickname2})).toHaveClass(/admin/);
      // Rank down user
      await chat.locator('#activeThread .users .wa-chat-item', {hasText: nickname2}).locator('.wa-dropdown button').click();
      await chat.locator('#activeThread .users .wa-chat-item', {hasText: nickname2}).locator('.wa-dropdown .rank-down').click();
      await expect(chat.locator('#activeThread .users .wa-chat-item', {hasText: nickname2})).toHaveClass(/user/);
      */

      if(fileExist('./fileLittle.txt')) deleteFile('./fileLittle.txt');
      if(fileExist('./fileBig.txt')) deleteFile('./fileBig.txt');

      // Exit forum
      await Chat.AT_close(page);


      // Walk to
      // A workaround to wait the end of svelte animation
      //eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(3_000);
      await Chat.slideToUsers(page);
      await Chat.UL_walkTo(page, nickname2);

      // FIXME After this issues is completed : https://github.com/thecodingmachine/workadventure/issues/2500
      //await Chat.openTimeline(page);
      //await expect(chat.locator('#activeTimeline #timeLine-messageList .event').last()).toContainText(nickname2 + ' join the discussion');
      // Close timeline
      //await Chat.closeTimeline(page);


      // Exit of liveZone
      await page.locator('#game canvas').click();
      await Map.rightClickToPosition(page, 380, 70);
      await Chat.slideToChat(page);
      await Chat.noChatZone(page);
      await page2.locator('#game canvas').click();
      await Map.rightClickToPosition(page2, 380, 200);
      await Chat.slideToChat(page2);
      await Chat.noChatZone(page2);
    });

    await test.step('default forum exist', async () => {
      await page.reload();
      await Menu.openChat(page);
      await Chat.slideToUsers(page);
      await Chat.checkNameInChat(page, nickname, TIMEOUT_TO_GET_LIST);

      await Chat.slideToChat(page);
      await Chat.forumExist(page, 'Welcome');
    });

    await test.step('disconnect and reconnect to ejabberd and pusher @docker', async () => {
      const chat = page.frameLocator('iframe#chatWorkAdventure').locator('aside.chatWindow');
      await Chat.slideToUsers(page);
      await Chat.checkNameInChat(page, nickname, TIMEOUT_TO_GET_LIST);

      await stopContainer(ejabberd);
      await expect(chat).toContainText("Waiting for server initialization");
      await startContainer(ejabberd);
      await Chat.slideToUsers(page);
      await Chat.checkNameInChat(page, nickname, TIMEOUT_TO_GET_LIST);

      const pusher = await findContainer('play');
      await stopContainer(pusher);
      await expect(page.locator('.errorScreen p.code')).toContainText('CONNECTION_');

      await startContainer(pusher);
      await Chat.slideToUsers(page);
      await Chat.checkNameInChat(page, nickname, TIMEOUT_TO_GET_LIST);
    });
  });
});

function getUniqueNickname(name: string){
  return `${name}_${Date.now().toString().split("").reverse().join("")}`.substring(0, 8);
}
