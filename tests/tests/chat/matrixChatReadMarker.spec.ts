import { expect, test, type Page } from "@playwright/test";
import axios from "axios";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";
import { matrix_server_url } from "../utils/urls";
import ChatUtils from "./chatUtils";
import matrixApi from "./matrixApi";

test.setTimeout(120000);

type MatrixUser = { userId: string; token: string };

function authHeaders(token: string) {
    return { headers: { Authorization: `Bearer ${token}` } };
}

async function createRoom(owner: MatrixUser, name: string, members: string[]): Promise<string> {
    const roomId = (
        await axios.post<{ room_id: string }>(
            `${matrix_server_url}/_matrix/client/v3/createRoom`,
            { name, preset: "public_chat" },
            authHeaders(owner.token),
        )
    ).data.room_id;
    for (const member of members) {
        await matrixApi.joinRoomAs(member, roomId);
    }
    return roomId;
}

async function send(sender: MatrixUser, roomId: string, body: string) {
    await axios.put(
        `${matrix_server_url}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${crypto.randomUUID()}`,
        { msgtype: "m.text", body },
        authHeaders(sender.token),
    );
}

async function openMatrixChat(page: Page): Promise<string> {
    test.skip(isMobile(page), "The room list layout differs on mobile");
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    await page.waitForFunction(() => localStorage.getItem("matrixUserId") !== null);
    return (await page.evaluate(() => localStorage.getItem("matrixUserId"))) ?? "";
}

test.describe("Matrix chat read marker @oidc @matrix @nowebkit", () => {
    test("a message received while the conversation is open is read", async ({ browser }) => {
        const suffix = Date.now().toString(36);
        const bob = await matrixApi.createUser(`read_bob_${suffix}`, "Read Bob");
        const roomName = `Read_${suffix}`;

        await using page = await getPage(browser, "Alice", Map.url("empty"));
        const roomId = await createRoom(bob, roomName, [await openMatrixChat(page)]);
        await page.getByTestId(roomName).click({ timeout: 60_000 });
        await expect(page.getByTestId("messageInput")).toBeVisible();

        await send(bob, roomId, "Are you there?");
        await expect(page.locator("#chat .messageContainer", { hasText: "Are you there?" })).toBeVisible();

        // Seen on screen: no unread count left behind, and no "new messages" line when coming back.
        await page.getByTestId("chatBackward").click();
        await expect(page.getByTestId(roomName).getByTestId("unreadCount")).toHaveCount(0);
        await page.getByTestId(roomName).click();
        await expect(page.locator("#chat .messageContainer", { hasText: "Are you there?" })).toBeVisible();
        await expect(page.getByTestId("unreadMessagesDivider")).toHaveCount(0);
    });
});
