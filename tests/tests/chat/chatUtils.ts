import { expect, type BrowserContext, type Page } from "@playwright/test";
import MatrixApi from "./matrixApi";

const DEFAULT_PASSPHRASE = "defaultPassphrase";

class ChatUtils {
    public async openChat(page: Page) {
        await page.getByTestId("chat-btn").click();
    }

    public async openProximityRoom(page: Page) {
        await this.openChat(page);

        const roomName = page.getByTestId("roomName");
        if ((await roomName.count()) > 0 && (await roomName.textContent())?.trim() === "Proximity Chat") {
            return;
        }

        await page.getByTestId("toggleDisplayProximityChat").click();
        await expect(roomName).toHaveText("Proximity Chat", { timeout: 60_000 });
    }

    public async openCreateRoomDialog(page: Page, folderName = "") {
        await page.getByTestId(`openOptionToCreateRoomOrFolder${folderName}`).click();
        await page.getByTestId(`openCreateRoomModalButton${folderName}`).click();
    }
    public async openCreateFolderDialog(page: Page, folderName = "") {
        await page.getByTestId(`openOptionToCreateRoomOrFolder${folderName}`).click();
        await page.getByTestId(`openCreateFolderModalButton${folderName}`).click();
    }

    public getRandomName() {
        return `RoomTest_${Math.floor(Math.random() * 10000)}`;
    }

    /**
     * Extracts a Matrix room id (`!opaque:server`) from the manage-participants room label text.
     */
    public parseMatrixRoomIdFromRoomLabelText(text: string): string {
        const match = text.match(/![^\s]+:[^\s]+/);
        if (!match) {
            throw new Error(`Could not parse Matrix room ID from room label (got: ${JSON.stringify(text)})`);
        }
        return match[0];
    }

    public async resetMatrixDatabase() {
        await MatrixApi.resetMatrixUsers();
    }

    public async initEndToEndEncryption(roomName: string, page: Page, context: BrowserContext) {
        // Here, sometimes, SSO redirection is required by the Synapse server, sometimes it is not.
        // It is not clear why, especially since it can change from one test run to another.

        // await page.waitForTimeout(1000);

        // The new room opens by itself; its encryption setup shows up over it.
        await expect(page.getByTestId("roomName")).toHaveText(roomName);

        // await page.getByTestId("VerifyWithPassphraseButton").click();

        //eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1000);
        //eslint-disable-next-line playwright/no-element-handle
        const ssoButton = await page.$("text=Continue with SSO");

        if (ssoButton) {
            const oidcPagePromise = context.waitForEvent("page", {
                // Give ample time for the SSO redirection
                timeout: 2000,
            });

            await page.getByText("Continue with SSO").click({
                timeout: 1000,
            });

            const oidcPage = await oidcPagePromise;
            await oidcPage.getByText("Continue with OIDC Server Mock").click();
            await page.getByText("Finish").click();
            await oidcPage.close();
        }

        await page.getByTestId("passphraseInput").fill(DEFAULT_PASSPHRASE);
        await page.getByText("Generate").click();
        await page.getByTestId("downloadRecoveryKeyButton").click();
        await page.getByText("Continue").click();
    }

    /** A new room opens by itself: check it is the one just created, then go back to the room list. */
    public async backToRoomListAfterCreation(page: Page, roomName: string) {
        await expect(page.getByTestId("roomName")).toHaveText(roomName);
        await page.getByTestId("chatBackward").click();
    }

    public async cancelledContinueWithSSO(page: Page, context: BrowserContext) {
        // await page.getByTestId("VerifyWithPassphraseButton").click();
        await page.getByTestId("cancelSSO").click();
    }

    public async restoreEncryption(page: Page) {
        // await page.getByTestId("VerifyWithPassphraseButton").click();
        await page.getByTestId("passphraseInput").waitFor({
            state: "visible",
            timeout: 20_000,
        });
        //wait before filling the passphrase input because it fill too fast and the blur event is not triggered or not detected
        //eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1000);
        await page.getByTestId("passphraseInput").fill(DEFAULT_PASSPHRASE);
        await page.getByTestId("passphraseInput").blur();
        await page.getByTestId("confirmAccessSecretStorageButton").click();
    }

    public async restoreEncryptionFromButton(page: Page) {
        await page.getByTestId("restoreEncryptionButton").click();
        await this.restoreEncryption(page);
    }

    public async closeChat(page: Page) {
        await page.getByTestId("closeChatButton").click();
    }

    public async isChatSidebarOpen(page: Page) {
        return page.getByTestId("closeChatButton").isVisible({
            timeout: 20_000,
        });
    }

    public async openRoomAreaList(page: Page) {
        return page.getByTestId("roomAccordeon").click();
    }

    public async sendMessage(page: Page, message: string) {
        await page.getByTestId("messageInput").fill(message);
        await page.getByTestId("messageInput").press("Enter");
    }

    public async expectProximityNotification(page: Page, message: string) {
        await expect(page.getByTestId("proximity-notification-message")).toHaveText(message);
    }

    public async expectUnreadMessagesCount(page: Page, count: number) {
        await expect(page.getByTestId("unreadMessagesCount")).toHaveText(count.toString());
    }
}

export default new ChatUtils();
