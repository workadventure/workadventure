import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import Map from "../utils/map";
import { getPage } from "../utils/auth";
import { publicTestMapUrl } from "../utils/urls";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

async function expectInBubbleWith(page: Page, names: string[]) {
    for (const name of names) {
        await expect(page.locator("#cameras-container").getByText(name, { exact: true }).first()).toBeVisible({
            timeout: 60_000,
        });
    }
}

/** Accepts the file offered in the proximity chat and returns the downloaded bytes. */
async function acceptAndDownload(page: Page, fileName: string): Promise<Buffer> {
    await page.getByTestId("acceptAttachmentButton").click({ timeout: 60_000 });
    const downloadLink = page.getByRole("link", { name: fileName });
    await expect(downloadLink).toBeVisible({ timeout: 60_000 });
    const downloadPromise = page.waitForEvent("download");
    await downloadLink.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(fileName);
    return readFile(await download.path());
}

test.describe("Proximity chat file transfer @nomobile @nowebkit", () => {
    test("should send a file peer to peer to every bubble member who accepts it", async ({ browser }) => {
        // Given Alice, Bob and Charlie are in the same bubble. Each one is moved before the next arrives,
        // so they do not first group up on the spawn tile.
        const mapUrl = publicTestMapUrl("tests/E2E/empty.json", "proximity_file_transfer");
        await using alice = await getPage(browser, "Alice", mapUrl);
        await Map.teleportToPosition(alice, 160, 160);
        await using bob = await getPage(browser, "Bob", mapUrl);
        await Map.teleportToPosition(bob, 160, 160);
        await using charlie = await getPage(browser, "Charlie", mapUrl);
        await Map.teleportToPosition(charlie, 160, 160);
        await expectInBubbleWith(alice, ["Bob", "Charlie"]);
        await expectInBubbleWith(bob, ["Alice"]);
        await expectInBubbleWith(charlie, ["Alice"]);
        for (const page of [alice, bob, charlie]) {
            await ChatUtils.openProximityRoom(page);
        }

        // When Alice sends a file spanning several data channel chunks.
        const fileName = "report.bin";
        const content = randomBytes(200_000);
        const fileChooserPromise = alice.waitForEvent("filechooser");
        await alice.getByTestId("addApplicationButton").click();
        await alice.getByTestId("fileAttachmentButton").click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles({ name: fileName, mimeType: "application/octet-stream", buffer: content });
        await alice.getByTestId("sendMessageButton").click();
        await expect(alice.getByText(fileName, { exact: true })).toBeVisible();
        // Alice already has the file: she is not offered to save it.
        await expect(alice.getByText("Save file")).toHaveCount(0);
        const recipientRow = (name: string) => alice.getByTestId("attachmentRecipient").filter({ hasText: name });
        await expect(recipientRow("Bob")).toContainText("Waiting");
        await expect(recipientRow("Charlie")).toContainText("Waiting");

        // Then Bob and Charlie are both offered the file, and each gets it byte for byte once accepted.
        expect((await acceptAndDownload(bob, fileName)).equals(content)).toBe(true);
        expect((await acceptAndDownload(charlie, fileName)).equals(content)).toBe(true);

        // And Alice sees that both have it, so she knows she can leave the bubble.
        await expect(recipientRow("Bob")).toContainText("Received");
        await expect(recipientRow("Charlie")).toContainText("Received");
    });

    test("should hold back files picked before the chat grew past the user limit", async ({ browser }) => {
        // Given Alice's limit is lowered to 2 people (the front reads it from window.env),
        // so that a third person is enough to go over it.
        const mapUrl = publicTestMapUrl("tests/E2E/empty.json", "proximity_file_transfer_limit");
        await using alice = await getPage(browser, "Alice", mapUrl, {
            pageCreatedHook: (page) =>
                page.addInitScript(() => {
                    let env: unknown;
                    Object.defineProperty(window, "env", {
                        configurable: true,
                        get: () => env,
                        set: (value: object) => {
                            env = { ...value, PROXIMITY_FILE_TRANSFER_MAX_USERS: 2 };
                        },
                    });
                }),
        });
        await Map.teleportToPosition(alice, 160, 160);
        await using bob = await getPage(browser, "Bob", mapUrl);
        await Map.teleportToPosition(bob, 160, 160);
        await expectInBubbleWith(alice, ["Bob"]);
        await ChatUtils.openProximityRoom(alice);

        // And Alice picks a file while the two of them are alone.
        const fileChooserPromise = alice.waitForEvent("filechooser");
        await alice.getByTestId("addApplicationButton").click();
        await alice.getByTestId("fileAttachmentButton").click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
        await expect(alice.getByTestId("fileError")).toHaveCount(0);
        await expect(alice.getByTestId("sendMessageButton")).toBeEnabled();

        // When Charlie joins before she sends it.
        await using charlie = await getPage(browser, "Charlie", mapUrl);
        await Map.teleportToPosition(charlie, 160, 160);

        // Then the preview says why the file cannot go, and sending is blocked.
        await expect(alice.getByTestId("fileError")).toHaveText(
            "File sharing is only available with 2 people or fewer",
            { timeout: 60_000 },
        );
        await expect(alice.getByTestId("sendMessageButton")).toBeDisabled();

        // And once Charlie walks away, the file can be sent again.
        await Map.teleportToPosition(charlie, 400, 400);
        await expect(alice.getByTestId("fileError")).toHaveCount(0, { timeout: 60_000 });
        await expect(alice.getByTestId("sendMessageButton")).toBeEnabled();
    });
});
