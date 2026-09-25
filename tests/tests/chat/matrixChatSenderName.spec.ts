import { expect, test } from "@playwright/test";
import axios from "axios";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";
import { matrix_domain, matrix_server_url } from "../utils/urls";
import ChatUtils from "./chatUtils";
import matrixApi from "./matrixApi";

test.setTimeout(120000);

const PASSWORD = "SenderNamePassword1";

async function login(user: string, password: string): Promise<string> {
    const response = await axios.post<{ access_token: string }>(`${matrix_server_url}/_matrix/client/v3/login`, {
        type: "m.login.password",
        identifier: { type: "m.id.user", user },
        password,
    });
    return response.data.access_token;
}

function authHeaders(token: string) {
    return { headers: { Authorization: `Bearer ${token}` } };
}

test.describe("Matrix chat sender names @oidc @matrix @nowebkit", () => {
    // With lazy-loaded members, someone who only speaks in older history is not in the room's current state:
    // their name has to come from the state at the time of their message, not from the current member list.
    test("shows the name of a sender who only appears in older history", async ({ browser }) => {
        const suffix = Date.now().toString(36);
        const oldSender = `sendername_old_${suffix}`;
        const chatter = `sendername_chatter_${suffix}`;
        const roomName = `SenderName_${suffix}`;

        const adminToken = await login("admin", "MySecretPassword");
        for (const [user, displayname] of [
            [oldSender, "Old Sender Name"],
            [chatter, "Chatter Name"],
        ]) {
            await axios.put(
                `${matrix_server_url}/_synapse/admin/v2/users/${encodeURIComponent(`@${user}:${matrix_domain}`)}`,
                { password: PASSWORD, displayname },
                authHeaders(adminToken),
            );
        }
        const oldSenderToken = await login(oldSender, PASSWORD);
        const chatterToken = await login(chatter, PASSWORD);
        await matrixApi.overrideRateLimitForUser(`@${chatter}:${matrix_domain}`);

        const roomId = (
            await axios.post<{ room_id: string }>(
                `${matrix_server_url}/_matrix/client/v3/createRoom`,
                { name: roomName, preset: "public_chat" },
                authHeaders(oldSenderToken),
            )
        ).data.room_id;
        const encodedRoomId = encodeURIComponent(roomId);
        await axios.post(`${matrix_server_url}/_matrix/client/v3/join/${encodedRoomId}`, {}, authHeaders(chatterToken));

        const send = (token: string, txnId: string, body: string) =>
            axios.put(
                `${matrix_server_url}/_matrix/client/v3/rooms/${encodedRoomId}/send/m.room.message/${txnId}`,
                { msgtype: "m.text", body },
                authHeaders(token),
            );
        await send(oldSenderToken, "old", "Message from the old sender");
        // Enough messages to push the old one out of the initial sync, so its sender is not lazy-loaded with it.
        for (let i = 0; i < 40; i++) {
            await send(chatterToken, `chatter${i}`, `Chatter message ${i}`);
        }

        await using page = await getPage(browser, "Alice", Map.url("empty"));
        test.skip(isMobile(page), "The room list layout differs on mobile");
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);

        // Joining after the login means the room, and its latest messages only, reach the client through /sync.
        let myUserId: string | null = null;
        await expect
            .poll(async () => (myUserId = await page.evaluate(() => localStorage.getItem("matrixUserId"))))
            .toBeTruthy();
        await axios.post(
            `${matrix_server_url}/_synapse/admin/v1/join/${encodedRoomId}`,
            { user_id: myUserId },
            authHeaders(adminToken),
        );
        await page.getByTestId(roomName).click({ timeout: 60_000 });

        const timeline = page.getByTestId("roomTimeline");
        const oldMessage = timeline.locator("li", { hasText: "Message from the old sender" });
        await expect(async () => {
            await timeline.locator("li").first().hover();
            // Pagination runs on a scroll event that lands on scrollTop 0, so move away from the top first.
            await page.mouse.wheel(0, 200);
            await page.mouse.wheel(0, -3000);
            await expect(oldMessage).toBeVisible({ timeout: 2_000 });
        }).toPass({ timeout: 60_000 });

        await expect(oldMessage).toContainText("Old Sender Name");
        await expect(oldMessage).not.toContainText(`@${oldSender}`);
    });
});
