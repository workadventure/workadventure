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

const MATRIX_HTML = "org.matrix.custom.html";

type MatrixUser = { userId: string; token: string };
type MessageContent = {
    body: string;
    format?: string;
    formatted_body?: string;
    "m.mentions"?: { user_ids?: string[]; room?: boolean };
};
type MatrixEvent = { type: string; sender: string; content: MessageContent };

function authHeaders(token: string) {
    return { headers: { Authorization: `Bearer ${token}` } };
}

async function getMyUserId(page: Page): Promise<string> {
    await page.waitForFunction(() => localStorage.getItem("matrixUserId") !== null);
    return (await page.evaluate(() => localStorage.getItem("matrixUserId"))) ?? "";
}

/** A public room created by `owner`, that `members` join right away. */
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

async function send(sender: MatrixUser, roomId: string, content: Record<string, unknown>) {
    await axios.put(
        `${matrix_server_url}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${crypto.randomUUID()}`,
        content,
        authHeaders(sender.token),
    );
}

/** The content of the last message someone other than `reader` sent, as the server stores it. */
async function lastMessageFromOthers(reader: MatrixUser, roomId: string): Promise<MessageContent | undefined> {
    const { data } = await axios.get<{ chunk: MatrixEvent[] }>(
        `${matrix_server_url}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?dir=b&limit=10`,
        authHeaders(reader.token),
    );
    const content = data.chunk.find(
        (event) => event.type === "m.room.message" && event.sender !== reader.userId,
    )?.content;
    // The composer may leave a no-break space after a pill.
    return content && { ...content, body: content.body.replace(/\s+/g, " ") };
}

async function openMatrixChat(page: Page) {
    test.skip(isMobile(page), "The room list layout differs on mobile");
    await oidcMatrixUserLogin(page);
    await ChatUtils.openChat(page);
    return getMyUserId(page);
}

test.describe("Matrix chat mentions @oidc @matrix @nowebkit", () => {
    test("sends a member picked after @ the way Element sends a mention", async ({ browser }) => {
        const suffix = Date.now().toString(36);
        const bob = await matrixApi.createUser(`mention_bob_${suffix}`, "Mention Bob");
        const roomName = `Mention_${suffix}`;

        await using page = await getPage(browser, "Alice", Map.url("empty"));
        const roomId = await createRoom(bob, roomName, [await openMatrixChat(page)]);
        await page.getByTestId(roomName).click({ timeout: 60_000 });

        await page.getByTestId("messageInput").click();
        await page.keyboard.type("Hello @ment");
        await expect(page.getByTestId("mentionSuggestions").getByRole("option")).toHaveText([/Mention Bob/]);
        await page.keyboard.press("Enter");
        await expect(page.getByTestId("messageInput").locator("a[data-mention]")).toHaveText("Mention Bob");
        await page.keyboard.type("can you review?");
        await page.keyboard.press("Enter");

        // m.mentions is what makes the server notify Bob, the matrix.to link what makes Element draw a pill.
        let content: MessageContent | undefined;
        await expect.poll(async () => (content = await lastMessageFromOthers(bob, roomId))).toBeDefined();
        expect(content).toMatchObject({
            body: "Hello @Mention Bob can you review?",
            format: MATRIX_HTML,
            "m.mentions": { user_ids: [bob.userId] },
        });
        expect(content?.formatted_body).toContain(`<a href="https://matrix.to/#/${bob.userId}">Mention Bob</a>`);
    });

    test("shows a mention sent from Element in red, even in a muted room", async ({ browser }) => {
        const suffix = Date.now().toString(36);
        const bob = await matrixApi.createUser(`mention_bob_${suffix}`, "Mention Bob");
        const mutedRoom = `Muted_${suffix}`;
        const otherRoom = `Other_${suffix}`;

        await using page = await getPage(browser, "Alice", Map.url("empty"));
        const myUserId = await openMatrixChat(page);
        const mutedRoomId = await createRoom(bob, mutedRoom, [myUserId]);
        await createRoom(bob, otherRoom, [myUserId]);

        const mutedRow = page.getByTestId(mutedRoom);
        await mutedRow.getByTestId("toggleRoomMenu").click({ timeout: 60_000 });
        await page.getByRole("button", { name: "Mute Room" }).click();
        await mutedRow.getByTestId("toggleRoomMenu").click();
        await expect(page.getByRole("button", { name: "Unmute Room" })).toBeVisible();
        await mutedRow.getByTestId("toggleRoomMenu").click();

        // Another conversation is open: a room that receives a message while the list shows opens by itself.
        await page.getByTestId(otherRoom).click();
        await send(bob, mutedRoomId, {
            msgtype: "m.text",
            body: "Alice: can you sign this?",
            format: MATRIX_HTML,
            formatted_body: `<a href="https://matrix.to/#/${myUserId}">Alice</a>: can you sign this?`,
            "m.mentions": { user_ids: [myUserId] },
        });
        await page.getByTestId("chatBackward").click();

        await expect(mutedRow.getByTestId("unreadCount")).toHaveAttribute("data-variant", "mention");
        await mutedRow.click();
        await expect(page.getByTestId("messageMentionsMe")).toBeVisible();
        await expect(page.locator("a[data-mention-me]")).toHaveText("Alice");
    });

    test("offers @room only to the members allowed to notify the whole room", async ({ browser }) => {
        const suffix = Date.now().toString(36);
        const bob = await matrixApi.createUser(`mention_bob_${suffix}`, "Mention Bob");
        const memberRoom = `Members_${suffix}`;
        const moderatorRoom = `Moderators_${suffix}`;

        await using page = await getPage(browser, "Alice", Map.url("empty"));
        const myUserId = await openMatrixChat(page);
        await createRoom(bob, memberRoom, [myUserId]);
        const moderatorRoomId = await createRoom(bob, moderatorRoom, [myUserId]);
        // notifications.room asks for 50 by default, a moderator. Set before the room is opened: the suggestions
        // read the power levels when the composer shows.
        const powerLevels = await matrixApi.getRoomStateEvent<{ users?: Record<string, number> }>(
            bob.token,
            moderatorRoomId,
            "m.room.power_levels",
        );
        await matrixApi.setRoomStateEvent(bob.token, moderatorRoomId, "m.room.power_levels", {
            ...powerLevels,
            users: { ...powerLevels.users, [myUserId]: 50 },
        });

        const suggestions = page.getByTestId("mentionSuggestions");
        const roomOption = suggestions.getByRole("option").filter({ hasText: /^\s*@\s*room/ });

        await page.getByTestId(memberRoom).click({ timeout: 60_000 });
        await page.getByTestId("messageInput").click();
        await page.keyboard.type("@");
        await expect(suggestions.getByRole("option", { name: /Mention Bob/ })).toBeVisible();
        await expect(roomOption).toHaveCount(0);
        await page.keyboard.press("Escape");
        await page.getByTestId("chatBackward").click();

        await page.getByTestId(moderatorRoom).click({ timeout: 60_000 });
        await page.getByTestId("messageInput").click();
        await page.keyboard.type("@all");
        await expect(roomOption).toBeVisible();
        await page.keyboard.press("Enter");
        await page.keyboard.type("meeting at 3pm");
        await page.keyboard.press("Enter");

        // Like Element: m.mentions.room notifies, "@room" stays plain text.
        let content: MessageContent | undefined;
        await expect.poll(async () => (content = await lastMessageFromOthers(bob, moderatorRoomId))).toBeDefined();
        expect(content).toMatchObject({ body: "@room meeting at 3pm", "m.mentions": { room: true } });
    });
});
