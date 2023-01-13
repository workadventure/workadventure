import {expect, Page} from "@playwright/test";
import {expectInViewport} from "./viewport";

class Chat {
    async slideToChat(page: Page){
        await this.get(page).locator('li:has-text("Chat")').click({timeout: 60_000});
    }
    async slideToUsers(page: Page){
        await this.get(page).locator('li:has-text("Users")').click({timeout: 60_000});
    }

    async checkNameInChat(page: Page, name: string, timeout = 30_000){
        await expect(page.frameLocator('iframe#chatWorkAdventure').locator('aside.chatWindow div.users')).toContainText(name, {timeout});
    }

    async open(page: Page) {
        await expect(page.locator("button#menuIcon")).toBeVisible();
        await page.click('button.chat-btn');
        await expectInViewport('#chatWindow', page);
        await expect(page.locator('button.chat-btn')).toHaveClass(/border-top-light/);
        await expect(page.locator('#chatWindow')).toHaveClass(/show/);
    }

    get(page: Page){
        return page.frameLocator('iframe#chatWorkAdventure').locator('aside.chatWindow');
    }

    async chatZoneExist(page: Page, name: string){
        await expect(this.get(page).locator('#chatZones')).toContainText('liveZone');
    }

    async noChatZone(page: Page){
        await expect(this.get(page)).not.toContain('#chatZones');
    }

    async openChatZone(page: Page){
        await this.get(page).locator('#chatZones .wa-chat-item .wa-dropdown button').click();
        await this.get(page).locator('#chatZones .wa-chat-item .wa-dropdown .open').click();
    }

    async openTimeline(page: Page){
        await this.get(page).locator('#timeline #openTimeline').click();
    }

    async closeTimeline(page: Page){
        await this.get(page).locator('#activeTimeline .exit').click();
    }

    async UL_walkTo(page: Page, nickname: string){
        await this.get(page).locator('.users .wa-chat-item', {hasText: nickname}).locator('.wa-dropdown button').click();
        await expect(this.get(page).locator('.users .wa-chat-item', {hasText: nickname}).locator('span:has-text("Walk to")')).toBeVisible();
        await this.get(page).locator('.users .wa-chat-item', {hasText: nickname}).locator('span:has-text("Walk to")').click({ timeout: 5_000 });
    }

    async AT_sendMessage(page: Page, text: string){
        await this.get(page).locator('#activeThread .wa-message-form div[contenteditable=true]').fill(text);
        await this.get(page).locator('#activeThread #send').click();
    }

    async AT_checkLastMessageSent(page: Page){
        await expect(this.get(page).locator('#activeThread .wa-messages-list .wa-message').last()).toHaveClass(/sent/);
    }

    async AT_checkLastMessageReceived(page: Page){
        await expect(this.get(page).locator('#activeThread .wa-messages-list .wa-message').last()).toHaveClass(/received/);
    }

    async AT_lastMessageContain(page: Page, text: string){
        await expect(this.get(page).locator('#activeThread .wa-messages-list .wa-message.received').last()).toContainText(text);
    }

    async AT_lastMessageReplyContain(page: Page, text: string){
        await expect(this.get(page).locator('#activeThread .wa-messages-list .wa-message.received').last().locator('.message-replied')).toContainText(text);
    }

    async AT_reactLastMessage(page: Page){
        await this.get(page).locator('#activeThread .wa-messages-list .wa-message.received').last().hover();
        await this.get(page).locator('#activeThread .wa-messages-list .wa-message.received').last().locator('.actions .action.react').click();
        await page.frameLocator('iframe#chatWorkAdventure').locator('.emoji-picker .emoji-picker__emojis button.emoji-picker__emoji').first().click();
        await expect(this.get(page).locator('#activeThread .wa-messages-list .wa-message.received').last().locator('.emojis span.active')).toBeDefined();
    }

    async AT_checkReactLastMessageReceived(page: Page){
        await expect(this.get(page).locator('#activeThread .wa-messages-list .wa-message.sent').last().locator('.emojis span')).toBeDefined();
    }

    async AT_lastMessageFileContain(page: Page, text: string){
        await expect(this.get(page).locator('#activeThread .wa-messages-list .wa-message').last().locator('.file')).toContainText(text);
    }

    async AT_replyToLastMessage(page: Page, text: string){
        const lastMessageText = await this.get(page).locator('#activeThread .wa-messages-list .wa-message.received').last().locator('.wa-message-body div').first().textContent();
        await this.get(page).locator('#activeThread .wa-messages-list .wa-message.received').last().hover();
        await this.get(page).locator('#activeThread .wa-messages-list .wa-message.received').last().locator('.actions .action.reply').click();
        await expect(this.get(page).locator('#activeThread .wa-message-form .replyMessage .message p')).toContainText(lastMessageText);
        await this.AT_sendMessage(page, text);
        await this.AT_checkLastMessageSent(page);
    }

    async AT_uploadFile(page: Page, fileName: string){
        await this.get(page).locator('#activeThread input#file').setInputFiles(fileName);
    }

    async AT_cantSend(page: Page){
        await expect(this.get(page).locator('#activeThread #send')).toHaveClass(/cant-send/);
    }

    async AT_canSend(page: Page){
        await expect(this.get(page).locator('#activeThread #send')).toHaveClass(/can-send/);
    }

    async AT_fileContainText(page: Page, text: string){
        await this.get(page).locator('#activeThread #send').hover();
        await expect(this.get(page).locator('#activeThread .upload-file')).toContainText(text);
    }

    async AT_deleteFile(page: Page){
        await this.get(page).locator('#activeThread .upload-file button.delete').click();
    }

    async AT_send(page: Page) {
        await this.get(page).locator('#activeThread #send').click();
    }

    async AT_close(page: Page){
        await this.get(page).locator('#activeThread .exit').click();
    }

    async expandUsers(page: Page){
        //await expect(page.locator('#users div:has-text("Users") button .feather-chevron-up')).toHaveClass(/tw-rotate-180/);
        await this.get(page).locator('#users div:has-text("Users") button > .feather-chevron-up').click();
        //await expect(page.locator('#users div:has-text("Users") button .feather-chevron-up')).not.toHaveClass(/tw-rotate-180/);
    }

    async forumExist(page: Page, name: string) {
        await expect(this.get(page).locator('#forumRooms')).toContainText(name);
    }
}

export default new Chat();
