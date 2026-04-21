import { expect, test, type Page } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { oidcMatrixUserLogin } from "../utils/oidc";
import { getPage } from "../utils/auth";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

async function openFreshMatrixRoom(page: Page, roomName: string) {
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    await page.getByTestId("createRoomName").fill(roomName);
    await page.getByPlaceholder("Users").click();
    await page.getByPlaceholder("Users").press("Enter");
    await page.getByTestId("createRoomButton").click();
    await page.getByText(roomName).click();
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

        await page.getByTestId("pollCard").getByRole("button", { name: /Pizza/ }).click();
        await page.getByTestId("submitPollVoteButton").click();

        await expect
            .poll(async () => (await page.getByTestId("pollParticipantsCount").textContent())?.trim())
            .toBe("1 vote(s)");
        await expect(page.getByTestId("pollCard")).toContainText("1 (100%)");

        await page.getByTestId("clearPollVoteButton").click();
        await expect
            .poll(async () => (await page.getByTestId("pollParticipantsCount").textContent())?.trim())
            .toBe("0 vote(s)");

        await page.getByTestId("pollCard").getByRole("button", { name: /Pizza/ }).click();
        await page.getByTestId("submitPollVoteButton").click();
        await expect
            .poll(async () => (await page.getByTestId("pollParticipantsCount").textContent())?.trim())
            .toBe("1 vote(s)");

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

        await page.getByTestId("pollCard").getByRole("button", { name: /Paris/ }).click();
        await page.getByTestId("submitPollVoteButton").click();

        await expect
            .poll(async () => (await page.getByTestId("pollParticipantsCount").textContent())?.trim())
            .toBe("1 vote(s)");
        await expect(page.getByText("Results will be shown when the poll is closed.")).toBeVisible();
        await expect(page.getByTestId("pollCard")).not.toContainText("1 (100%)");

        await page.getByTestId("endPollButton").click();
        await expect(page.getByTestId("pollClosedNotice")).toBeVisible();
        await expect(page.getByTestId("pollCard")).toContainText("1 (100%)");
    });
});
