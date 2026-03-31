import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { getPage } from "../utils/auth";
import { pusher_url } from "../utils/urls";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

/**
 * Matrix "guest" = compte Synapse créé via `kind: "guest"` (POST /matrixGuestLogin + stockage client).
 * Nécessite côté infra : anonymous activé, MATRIX_PUBLIC_URI sur le play, MATRIX_API_URI + guest sur Synapse.
 */
test.describe("Matrix guest (anonymous Matrix session) @matrix @guest @nowebkit", () => {
    test.beforeEach(async ({ request, browserName }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
        await resetWamMaps(request);
        await ChatUtils.resetMatrixDatabase();
    });

    test.afterAll(async () => {
        await ChatUtils.resetMatrixDatabase();
    });

    test("Pusher matrixGuestLogin returns Synapse guest credentials", async ({ request }) => {
        const response = await request.post(`${pusher_url}/matrixGuestLogin`);

        if (response.status() === 503) {
            test.skip(true, "Matrix guest login is not configured on pusher (MATRIX_API_URI / MATRIX_PUBLIC_URI)");
        }
        if (response.status() === 403) {
            test.skip(true, "Anonymous login is disabled (DISABLE_ANONYMOUS)");
        }

        expect(response.ok()).toBeTruthy();

        const body = (await response.json()) as Record<string, unknown>;
        expect(typeof body.authToken).toBe("string");
        expect(typeof body.userUuid).toBe("string");
        expect(typeof body.matrixAccessToken).toBe("string");
        expect(typeof body.matrixDeviceId).toBe("string");
        expect(typeof body.matrixServerUrl).toBe("string");
        expect(body.matrixUserId).toMatch(/^@[^:]+:.+/);
    });

    test("GuestMatrix user has matrixGuest in storage and can open chat without OpenID", async ({ browser }) => {
        await using page = await getPage(browser, "GuestMatrix", Map.url("empty"));

        const isMatrixGuest = await page.evaluate(() => localStorage.getItem("matrixGuest") === "true");
        expect(isMatrixGuest).toBe(true);

        const matrixUserId = await page.evaluate(() => localStorage.getItem("matrixUserId"));
        expect(matrixUserId).toMatch(/^@[^:]+:.+/);

        await ChatUtils.openChat(page);
        await expect(page.getByTestId("chat")).toBeAttached();

        await page.context().close();
    });

    test("Guest sends a message in a public room", async ({ browser }) => {
        await using page = await getPage(browser, "GuestMatrix", Map.url("empty"));

        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByPlaceholder("Users").click();
        await page.getByPlaceholder("Users").press("Enter");
        await page.getByTestId("createRoomButton").click();
        await page.getByText(publicChatRoomName).click();

        const chatMessageContent = "Guest matrix test message";
        await page.getByTestId("messageInput").fill(chatMessageContent);
        await page.getByTestId("sendMessageButton").click();
        await expect(page.getByText(chatMessageContent)).toBeAttached();

        await page.context().close();
    });
});
