import { expect, test, type Page } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import ChatUtils from "./chatUtils";
import matrixApi from "./matrixApi";

test.setTimeout(120000);

interface CreatedRoom {
    roomName: string;
    roomId: string;
    /** Access token of the room creator, used to read/write the room state directly via the Matrix API. */
    token: string;
}

async function createRoom(page: Page): Promise<CreatedRoom> {
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const roomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(roomName);
    await page.getByTestId("createRoomButton").click();

    await expect(page.getByText(roomName)).toBeAttached();

    // Read the real Matrix room id from the manage-participants modal (mirrors matrixChatModeration.spec.ts).
    // Going through the UI guarantees the room exists server-side before we query it via the admin API.
    await page.getByTestId(roomName).hover();
    await page.getByTestId(roomName).getByTestId("toggleRoomMenu").click();
    await page.getByTestId(roomName).getByTestId("manageParticipantOption").click();
    await expect(page.getByTestId("roomID")).toBeVisible();
    const roomId = ChatUtils.parseMatrixRoomIdFromRoomLabelText(
        (await page.getByTestId("roomID").textContent())?.trim() ?? "",
    );
    await page.getByTestId("closeModal").click();

    const token = await matrixApi.getRoomCreatorToken(roomId);

    return { roomName, roomId, token };
}

async function openRoomSettings(page: Page, roomName: string): Promise<void> {
    await page.getByTestId(roomName).click({ timeout: 60_000 });
    await page.getByTestId("toggleRoomSidePanelButton").click();
    await expect(page.getByTestId("roomSidePanelHome")).toBeVisible();
    await page.getByTestId("roomSidePanelHomeSettings").click();
    await expect(page.getByTestId("roomSidePanelSettings")).toBeVisible();
}

test.describe("chat room settings @matrix @nowebkit", () => {
    test.beforeEach(
        "Ignore tests on webkit because of issue with camera and microphone",
        async ({ browserName, request }) => {
            test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
            await resetWamMaps(request);
            await ChatUtils.resetMatrixDatabase();
        },
    );

    test.afterAll("reset matrix database", async () => {
        await ChatUtils.resetMatrixDatabase();
    });

    // Regression test for the "editing an unrelated field silently resets access / history visibility"
    // bug: the settings <select>s can only represent a subset of the Matrix values, so the current
    // state is collapsed to the closest option ("public" -> "invite", "shared" -> "joined"). Saving must
    // NOT forward those collapsed values unless the user actually changed the corresponding control.
    test("editing only the name must not reset the join rule or history visibility", async ({ browser }, testInfo) => {
        test.skip(testInfo.project.name === "mobilefirefox", "Skip on mobile Firefox");

        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);

        const { roomName, roomId, token } = await createRoom(page);

        // Force the room into states the creation UI cannot produce and the settings <select>s cannot
        // represent exactly.
        await matrixApi.setRoomStateEvent(token, roomId, "m.room.join_rules", { join_rule: "public" });
        await matrixApi.setRoomStateEvent(token, roomId, "m.room.history_visibility", {
            history_visibility: "shared",
        });

        await openRoomSettings(page, roomName);

        // Edit ONLY the room name and save.
        const newName = `${roomName}_renamed`;
        await page.getByTestId("roomSettingsNameInput").fill(newName);
        await page.getByTestId("roomSettingsSaveButton").click();
        await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 15_000 });

        // The name change must be persisted (this proves the save actually ran)...
        const nameEvent = await matrixApi.getRoomStateEvent<{ name?: string }>(token, roomId, "m.room.name");
        expect(nameEvent.name).toBe(newName);

        // ...but the untouched join rule and history visibility must be left exactly as they were.
        const joinRules = await matrixApi.getRoomStateEvent<{ join_rule?: string }>(token, roomId, "m.room.join_rules");
        expect(joinRules.join_rule).toBe("public");

        const historyVisibility = await matrixApi.getRoomStateEvent<{ history_visibility?: string }>(
            token,
            roomId,
            "m.room.history_visibility",
        );
        expect(historyVisibility.history_visibility).toBe("shared");
    });

    // Happy path: the settings panel actually persists the values the user edits.
    test("saving edited settings persists name, topic, history visibility and permissions", async ({
        browser,
    }, testInfo) => {
        test.skip(testInfo.project.name === "mobilefirefox", "Skip on mobile Firefox");

        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);

        const { roomName, roomId, token } = await createRoom(page);

        await openRoomSettings(page, roomName);

        const newName = `${roomName}_edited`;
        const newTopic = "A brand new topic";
        await page.getByTestId("roomSettingsNameInput").fill(newName);
        await page.getByTestId("roomSettingsTopicInput").fill(newTopic);
        await page.getByTestId("roomSettingsHistoryVisibilitySelect").selectOption("invited");
        await page.getByTestId("roomPermission-sendReactions").selectOption("MODERATOR");

        await page.getByTestId("roomSettingsSaveButton").click();
        await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 15_000 });

        const nameEvent = await matrixApi.getRoomStateEvent<{ name?: string }>(token, roomId, "m.room.name");
        expect(nameEvent.name).toBe(newName);

        const topicEvent = await matrixApi.getRoomStateEvent<{ topic?: string }>(token, roomId, "m.room.topic");
        expect(topicEvent.topic).toBe(newTopic);

        const historyVisibility = await matrixApi.getRoomStateEvent<{ history_visibility?: string }>(
            token,
            roomId,
            "m.room.history_visibility",
        );
        expect(historyVisibility.history_visibility).toBe("invited");

        // "sendReactions" maps to the m.reaction event power level; MODERATOR is power level 50.
        const powerLevels = await matrixApi.getRoomStateEvent<{ events?: Record<string, number> }>(
            token,
            roomId,
            "m.room.power_levels",
        );
        expect(powerLevels.events?.["m.reaction"]).toBe(50);
    });
});
