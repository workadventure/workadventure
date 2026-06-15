import { expect, test, type Page } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

async function joinSameProximityChat(adminPage: Page, memberPage: Page) {
    await Map.teleportToPosition(adminPage, 160, 160);
    await Map.teleportToPosition(memberPage, 160, 160);

    await expect(adminPage.locator("#cameras-container").getByText("Member1", { exact: true }).first()).toBeVisible({
        timeout: 60_000,
    });
    await expect(memberPage.locator("#cameras-container").getByText("Admin1", { exact: true }).first()).toBeVisible({
        timeout: 60_000,
    });
}

async function openProximityRoom(page: Page) {
    await ChatUtils.openChat(page);

    const roomName = page.getByTestId("roomName");
    if ((await roomName.count()) > 0 && (await roomName.textContent())?.trim() === "Proximity Chat") {
        return;
    }

    await page.getByTestId("toggleDisplayProximityChat").click();
    await expect(roomName).toHaveText("Proximity Chat", { timeout: 60_000 });
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
        await page.getByTestId(`createPollAnswerInput-${index}`).fill(options.answers[index]);
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

async function openProximitySidePanel(page: Page) {
    await page.getByTestId("toggleRoomSidePanelButton").click();
    await expect(page.getByTestId("proximityRoomSidePanelHome")).toBeVisible();
}

async function openProximityQuestionsPanel(page: Page) {
    await openProximitySidePanel(page);
    await page.getByTestId("proximityRoomSidePanelHomeQuestions").click();
    await expect(page.getByTestId("proximityRoomSidePanelQuestions")).toBeVisible();
}

async function openProximityQuestionsFromComposer(page: Page) {
    await page.getByTestId("addApplicationButton").click();
    await page.getByTestId("openQuestionsPanelButton").click();
    await expect(page.getByTestId("proximityRoomSidePanelQuestions")).toBeVisible();
}

function questionItem(page: Page, question: string) {
    return page.getByTestId("proximityQuestionItem").filter({ hasText: question });
}

async function expectQuestionUpvoteCount(page: Page, question: string, count: number) {
    await expect(questionItem(page, question).getByTestId("proximityQuestionUpvoteButton")).toContainText(
        count.toString(),
    );
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Proximity chat polls and questions @oidc @nomobile @nowebkit", () => {
    test.beforeEach(async ({ request, browserName, page }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
        test.skip(isMobile(page), "Proximity chat smoke tests target the desktop chat layout");
        await resetWamMaps(request);
    });

    test("should synchronize an open poll and allow only the creator to close and delete it", async ({ browser }) => {
        // Given Admin1 and Member1 are in the same proximity chat.
        await using adminPage = await getPage(browser, "Admin1", Map.url("empty"));
        await using memberPage = await getPage(browser, "Member1", Map.url("empty"));
        await joinSameProximityChat(adminPage, memberPage);
        await openProximityRoom(adminPage);
        await openProximityRoom(memberPage);

        // When Admin1 creates a poll and both participants vote.
        await createPoll(adminPage, {
            question: "Which format should we use?",
            answers: ["Workshop", "Demo"],
            visibility: "open",
        });
        await expect(memberPage.getByTestId("pollQuestion")).toHaveText("Which format should we use?", {
            timeout: 60_000,
        });

        await voteForAnswer(adminPage, "Workshop");
        await voteForAnswer(memberPage, "Demo");

        // Then both participants see synchronized results and only Admin1 can close/delete the poll.
        await expectParticipantsCount(adminPage, 2);
        await expectParticipantsCount(memberPage, 2);
        await expectPollResult(adminPage, "Workshop", 1, 50);
        await expectPollResult(adminPage, "Demo", 1, 50);
        await expectPollResult(memberPage, "Workshop", 1, 50);
        await expectPollResult(memberPage, "Demo", 1, 50);
        await expect(memberPage.getByTestId("endPollButton")).toBeHidden();
        await expect(memberPage.getByTestId("deletePollButton")).toBeHidden();

        await adminPage.getByTestId("endPollButton").click();
        await expect(adminPage.getByTestId("pollClosedNotice")).toBeVisible();
        await expect(memberPage.getByTestId("pollClosedNotice")).toBeVisible({ timeout: 60_000 });

        await adminPage.getByTestId("deletePollButton").click();
        await expect(adminPage.getByTestId("pollQuestion")).toBeHidden();
        await expect(memberPage.getByTestId("pollQuestion")).toBeHidden({ timeout: 60_000 });
    });

    test("should hide closed-poll results until the poll is closed", async ({ browser }) => {
        // Given two participants are in the same proximity chat.
        await using adminPage = await getPage(browser, "Admin1", Map.url("empty"));
        await using memberPage = await getPage(browser, "Member1", Map.url("empty"));
        await joinSameProximityChat(adminPage, memberPage);
        await openProximityRoom(adminPage);
        await openProximityRoom(memberPage);

        // When Admin1 creates a closed poll and Member1 votes.
        await createPoll(adminPage, {
            question: "Where should we meet?",
            answers: ["Lobby", "Auditorium"],
            visibility: "closed",
        });
        await expect(memberPage.getByTestId("pollQuestion")).toHaveText("Where should we meet?", { timeout: 60_000 });
        await voteForAnswer(memberPage, "Lobby");

        // Then vote counts are updated but detailed results stay hidden until the creator closes the poll.
        await expectParticipantsCount(adminPage, 1);
        await expectParticipantsCount(memberPage, 1);
        await expect(adminPage.getByText("Results will be shown when the poll is closed.")).toBeVisible();
        await expect(memberPage.getByText("Results will be shown when the poll is closed.")).toBeVisible();
        await expect(adminPage.getByTestId("pollCard")).not.toContainText("1 (100%)");
        await expect(memberPage.getByTestId("pollCard")).not.toContainText("1 (100%)");

        await adminPage.getByTestId("endPollButton").click();
        await expect(adminPage.getByTestId("pollClosedNotice")).toBeVisible();
        await expect(memberPage.getByTestId("pollClosedNotice")).toBeVisible({ timeout: 60_000 });
        await expect(adminPage.getByTestId("pollCard")).toContainText("1 (100%)");
        await expect(memberPage.getByTestId("pollCard")).toContainText("1 (100%)");
    });

    test("should synchronize proximity questions, upvotes and answered state", async ({ browser }) => {
        // Given Member1, Alice and Admin1 are in the same proximity chat.
        await using adminPage = await getPage(browser, "Admin1", Map.url("empty"));
        await using memberPage = await getPage(browser, "Member1", Map.url("empty"));
        await using voterPage = await getPage(browser, "Alice", Map.url("empty"));
        await joinSameProximityChat(adminPage, memberPage);
        await Map.teleportToPosition(voterPage, 160, 160);
        await expect(adminPage.locator("#cameras-container").getByText("Alice", { exact: true }).first()).toBeVisible({
            timeout: 60_000,
        });
        await expect(voterPage.locator("#cameras-container").getByText("Member1", { exact: true }).first()).toBeVisible({
            timeout: 60_000,
        });
        await openProximityRoom(memberPage);
        await openProximityRoom(voterPage);
        await openProximityRoom(adminPage);

        // When Member1 asks a question from the composer shortcut.
        const question = "Can we share the recording after the session?";
        await openProximityQuestionsFromComposer(memberPage);
        await memberPage.getByTestId("proximityQuestionInput").fill(question);
        await memberPage.getByTestId("proximityQuestionSubmit").click();
        await expect(questionItem(memberPage, question)).toBeVisible();

        // Then Alice can upvote it, and Admin1 can also upvote it and mark it as answered.
        await openProximityQuestionsPanel(voterPage);
        await expect(questionItem(voterPage, question)).toBeVisible({ timeout: 60_000 });
        await questionItem(voterPage, question).getByTestId("proximityQuestionUpvoteButton").click();
        await expectQuestionUpvoteCount(voterPage, question, 1);
        await expectQuestionUpvoteCount(memberPage, question, 1);

        await openProximityQuestionsPanel(adminPage);
        await expect(questionItem(adminPage, question)).toBeVisible({ timeout: 60_000 });
        await questionItem(adminPage, question).getByTestId("proximityQuestionUpvoteButton").click();
        await expectQuestionUpvoteCount(adminPage, question, 2);
        await expectQuestionUpvoteCount(voterPage, question, 2);
        await expectQuestionUpvoteCount(memberPage, question, 2);

        await questionItem(adminPage, question).getByTestId("proximityQuestionMarkAnsweredButton").click();
        await expect(questionItem(adminPage, question)).toBeHidden();
        await adminPage.getByTestId("proximityQuestionsAnsweredFilter").click();
        await expect(questionItem(adminPage, question)).toBeVisible();
        await expect(questionItem(adminPage, question)).toContainText("Answered");

        await memberPage.getByTestId("proximityQuestionsAnsweredFilter").click();
        await expect(questionItem(memberPage, question)).toBeVisible({ timeout: 60_000 });
        await expect(questionItem(memberPage, question)).toContainText("Answered");
    });
});
