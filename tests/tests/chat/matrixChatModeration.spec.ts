import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import ChatUtils from "./chatUtils";
import matrixApi from "./matrixApi";

const JOHN = "@john.doe:matrix.workadventure.localhost";
const ADMIN = "@admin:matrix.workadventure.localhost";

test.setTimeout(120000);

test.describe("chat moderation @matrix @nowebkit", () => {
    test.beforeEach(
        "Ignore tests on webkit because of issue with camera and microphone",

        async ({ browserName, request, page }) => {
            // WebKit has issue with camera
            test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
            await resetWamMaps(request);
            await page.goto(Map.url("empty"));
            await ChatUtils.resetMatrixDatabase();
        },
    );

    test.afterAll("reset matrix database", async () => {
        await ChatUtils.resetMatrixDatabase();
    });

    test("should create a public chat room and verify admin permissions", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByTestId("createRoomButton").click();
        await ChatUtils.backToRoomListAfterCreation(page, publicChatRoomName);

        await expect(page.getByText(publicChatRoomName)).toBeAttached();

        await expect(page.getByTestId(publicChatRoomName).getByTestId("toggleRoomMenu")).toBeAttached();

        await page.getByTestId(publicChatRoomName).hover();
        await page.getByTestId(publicChatRoomName).getByTestId("toggleRoomMenu").click();

        await page.getByTestId(publicChatRoomName).getByTestId("roomMembersOption").click();

        const members = page.getByTestId("roomSidePanelParticipants");
        await expect(members).toBeVisible();
        await expect(
            members.getByTestId("roomSidePanelMembers-joined").getByTestId(`${JOHN}-panel-row`),
        ).toBeAttached();
        await expect(members.getByTestId(`${JOHN}-panel-status`)).toHaveText("Admin");
    });

    test("should manage participants and permissions in public chat room", async ({ browser }, testInfo) => {
        test.skip(testInfo.project.name === "mobilefirefox", "Skip on mobile Firefox");

        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);
        await ChatUtils.openChat(page);
        await ChatUtils.openCreateRoomDialog(page);
        const publicChatRoomName = ChatUtils.getRandomName();
        await page.getByTestId("createRoomName").fill(publicChatRoomName);
        await page.getByTestId("createRoomButton").click();
        await expect(page.getByTestId("roomName")).toHaveText(publicChatRoomName);
        const roomId = await ChatUtils.readOpenRoomId(page);
        await ChatUtils.backToRoomListAfterCreation(page, publicChatRoomName);

        await matrixApi.overrideRateLimitForUser("@john.doe:matrix.workadventure.localhost");

        await expect(page.getByText(publicChatRoomName)).toBeAttached();

        await expect(page.getByTestId(publicChatRoomName).getByTestId("toggleRoomMenu")).toBeAttached();

        await page.getByTestId(publicChatRoomName).hover();
        await page.getByTestId(publicChatRoomName).getByTestId("toggleRoomMenu").click();

        await page.getByTestId(publicChatRoomName).getByTestId("roomMembersOption").click();

        const members = page.getByTestId("roomSidePanelParticipants");
        await expect(members.getByTestId(`${JOHN}-panel-row`)).toBeAttached();

        // Opened from the menu by an admin: the focus is in the invite field.
        const inviteField = members.getByPlaceholder("Invite by name or e-mail…");
        await expect(inviteField).toBeFocused();
        await inviteField.fill(ADMIN);
        await members.getByText(`${ADMIN} (${ADMIN})`).click();

        await members.getByTestId("roomSidePanelSendInvitations").click();
        // Those invited leave the selection
        await expect(members.locator(".clear-select")).toBeHidden();
        await expect(members.getByTestId(`${ADMIN}-panel-status`)).toHaveText("Invited");

        const memberAction = async (action: string) => {
            await members.getByTestId(`${ADMIN}-panel-memberMenu`).click();
            await members.getByTestId(`${ADMIN}-panel-${action}`).click();
        };

        await members.getByTestId(`${ADMIN}-panel-memberMenu`).click();
        await expect(members.getByTestId(`${ADMIN}-panel-cancelInvitationButton`)).toBeVisible();
        await members.getByTestId(`${ADMIN}-panel-banButton`).click();
        // Banning asks first.
        await page.getByTestId("confirmDialogConfirm").click();

        // Left and banned people are folded under their own section.
        await expect(members.getByTestId(`${ADMIN}-panel-status`)).toHaveText("Banned");
        await members.getByTestId("roomSidePanelMembers-left").locator("summary").click();
        await memberAction("unbanButton");

        await expect(members.getByTestId(`${ADMIN}-panel-status`)).toHaveText("Left");
        await memberAction("inviteButton");
        await expect(members.getByTestId(`${ADMIN}-panel-status`)).toHaveText("Invited");

        // Members are reached from the panel overview.
        await page.getByTestId("roomSidePanelBackButton").click();

        await matrixApi.acceptRoomInvitations(roomId);

        await page.getByTestId("roomSidePanelHomeParticipants").click();
        await expect(members.getByTestId(`${ADMIN}-panel-status`)).toHaveText("User");

        await members.getByTestId(`${ADMIN}-panel-memberMenu`).click();
        await expect(members.getByTestId(`${ADMIN}-panel-kickButton`)).toBeVisible();
        await expect(members.getByTestId(`${ADMIN}-panel-banButton`)).toBeVisible();
        await members.getByTestId(`${ADMIN}-panel-role-MODERATOR`).click();
        await expect(members.getByTestId(`${ADMIN}-panel-status`)).toHaveText("Moderator");

        const powerLevel = await matrixApi.getMemberPowerLevel(roomId);

        expect(powerLevel).toBe(50);
    });
});
