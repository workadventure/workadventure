import { expect, test, type Page } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin, oidcMemberTagLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import { matrix_domain } from "../utils/urls";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

const MEMBER1_MATRIX_USER_ID = `@alice.doe:${matrix_domain}`;

async function openFreshMatrixRoom(page: Page, roomName: string, invitedUsers: string[] = []) {
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    await page.getByTestId("createRoomName").fill(roomName);

    const usersInput = page.getByPlaceholder("Users");
    if (invitedUsers.length === 0) {
        await usersInput.click();
        await usersInput.press("Enter");
    } else {
        for (const invitedUser of invitedUsers) {
            await usersInput.fill(invitedUser);
            await usersInput.press("Enter");
        }
    }

    await page.getByTestId("createRoomButton").click();
    await page.getByText(roomName).click();
}

async function openExistingMatrixRoom(page: Page, roomName: string) {
    await ChatUtils.openChat(page);

    const invitedRoom = page.getByTestId("userInvitation").filter({ hasText: roomName });
    const joinedRoom = page.getByTestId(roomName);

    if (await invitedRoom.isVisible({ timeout: 60_000 }).catch(() => false)) {
        await invitedRoom.getByTestId("acceptInvitationButton").click();
    } else {
        await expect(joinedRoom).toBeVisible({ timeout: 60_000 });
        await joinedRoom.click();
    }

    await expect(page.getByTestId("roomName")).toHaveText(roomName, { timeout: 60_000 });
}

async function createPoll(
    page: Page,
    options: {
        question: string;
        answers: [string, string, ...string[]];
        visibility?: "open" | "closed";
    },
) {
    await page.getByTestId("addApplicationButton").click();
    await page.getByTestId("createPollButton").click();
    await page.getByTestId("createPollQuestionInput").fill(options.question);

    for (let index = 0; index < options.answers.length; index++) {
        const answer = options.answers[index];
        await page.getByTestId(`createPollAnswerInput-${index}`).fill(answer);
    }

    if (options.visibility === "closed") {
        await page.getByTestId("createPollVisibilityClosed").click();
    } else {
        await page.getByTestId("createPollVisibilityOpen").click();
    }

    await page.getByTestId("submitCreatePollButton").click();
    await expect(page.getByTestId("pollQuestion")).toHaveText(options.question);
}

async function voteForAnswer(page: Page, answer: string) {
    await page
        .getByTestId("pollCard")
        .getByRole("button", { name: new RegExp(escapeRegExp(answer)) })
        .click();
}

async function expectParticipantsCount(page: Page, count: number) {
    await expect
        .poll(async () => (await page.getByTestId("pollParticipantsCount").textContent())?.trim())
        .toBe(`${count} vote(s)`);
}

async function expectPollResult(page: Page, answer: string, votes: number, percentage: number) {
    await expect(
        page.getByTestId("pollCard").getByRole("button", { name: new RegExp(escapeRegExp(answer)) }),
    ).toContainText(`${votes} (${percentage}%)`);
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function moveAwayFromProximityChat(page: Page, x: number, y: number) {
    await Map.teleportToPosition(page, x, y);
}

test.describe("Matrix chat polls @oidc @matrix @nowebkit", () => {
    test.beforeEach(async ({ request, browserName }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
        await resetWamMaps(request);
        await ChatUtils.resetMatrixDatabase();
    });

    test.afterAll(async () => {
        await ChatUtils.resetMatrixDatabase();
    });

    test("should react on the first vote, then allow close and delete", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);

        const roomName = ChatUtils.getRandomName();
        await openFreshMatrixRoom(page, roomName);
        await createPoll(page, {
            question: "What should we eat?",
            answers: ["Pizza", "Sushi"],
            visibility: "open",
        });

        await voteForAnswer(page, "Pizza");

        await expectParticipantsCount(page, 1);
        await expectPollResult(page, "Pizza", 1, 100);

        await voteForAnswer(page, "Pizza");
        await expectParticipantsCount(page, 0);

        await voteForAnswer(page, "Pizza");
        await expectParticipantsCount(page, 1);

        await page.getByTestId("endPollButton").click();
        await expect(page.getByTestId("pollClosedNotice")).toBeVisible();
        await expect(page.getByTestId("endPollButton")).toBeHidden();

        await page.getByTestId("deletePollButton").click();
        await expect(page.getByTestId("pollQuestion")).toBeHidden();
    });

    test("should hide closed-poll results until the poll is closed", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(page);

        const roomName = ChatUtils.getRandomName();
        await openFreshMatrixRoom(page, roomName);
        await createPoll(page, {
            question: "Where do we meet?",
            answers: ["Paris", "Lyon"],
            visibility: "closed",
        });

        await voteForAnswer(page, "Paris");

        await expectParticipantsCount(page, 1);
        await expect(page.getByText("Results will be shown when the poll is closed.")).toBeVisible();
        await expect(page.getByTestId("pollCard")).not.toContainText("1 (100%)");

        await page.getByTestId("endPollButton").click();
        await expect(page.getByTestId("pollClosedNotice")).toBeVisible();
        await expect(page.getByTestId("pollCard")).toContainText("1 (100%)");
    });

    test("should synchronize poll votes between two participants", async ({ browser }) => {
        await using alicePage = await getPage(browser, "Alice", Map.url("empty"));
        await oidcMatrixUserLogin(alicePage);
        await moveAwayFromProximityChat(alicePage, 0, 0);

        await using bobPage = await getPage(browser, "Bob", Map.url("empty"));
        await oidcMemberTagLogin(bobPage);
        await moveAwayFromProximityChat(bobPage, 8 * 32, 8 * 32);

        const roomName = ChatUtils.getRandomName();
        await openFreshMatrixRoom(alicePage, roomName, [MEMBER1_MATRIX_USER_ID]);
        await openExistingMatrixRoom(bobPage, roomName);

        await createPoll(alicePage, {
            question: "Which day works best?",
            answers: ["Monday", "Tuesday"],
            visibility: "open",
        });
        await expect(bobPage.getByTestId("pollQuestion")).toHaveText("Which day works best?", { timeout: 60_000 });

        await voteForAnswer(alicePage, "Monday");
        await expectParticipantsCount(alicePage, 1);
        await expectPollResult(alicePage, "Monday", 1, 100);

        await voteForAnswer(bobPage, "Tuesday");
        await expectParticipantsCount(bobPage, 2);
        await expectParticipantsCount(alicePage, 2);
        await expectPollResult(alicePage, "Monday", 1, 50);
        await expectPollResult(alicePage, "Tuesday", 1, 50);
        await expectPollResult(bobPage, "Monday", 1, 50);
        await expectPollResult(bobPage, "Tuesday", 1, 50);

        await voteForAnswer(bobPage, "Monday");
        await expectParticipantsCount(bobPage, 2);
        await expectParticipantsCount(alicePage, 2);
        await expectPollResult(alicePage, "Monday", 2, 100);
        await expectPollResult(alicePage, "Tuesday", 0, 0);
        await expectPollResult(bobPage, "Monday", 2, 100);
        await expectPollResult(bobPage, "Tuesday", 0, 0);
    });
});
