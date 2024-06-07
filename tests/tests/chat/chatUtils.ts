import { Page } from "@playwright/test";

class ChatUtils {
  public async openChat(page: Page) {
    await page.click("button.chat-btn");
  }

  public async openCreateRoomDialog(page: Page) {
    await page.getByTestId("openCreateRoomModalButton").click();
  }

  public getRandomName() {
    return `RoomTest_${Math.floor(Math.random() * 100)}`;
  }
}

export default new ChatUtils();
