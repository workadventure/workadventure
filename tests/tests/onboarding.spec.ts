import { expect, test, type Page } from "@playwright/test";
import Map from "./utils/map";
import Menu from "./utils/menu";
import { getPage } from "./utils/auth";
import { resetWamMaps } from "./utils/map-editor/uploader";
import { evaluateScript } from "./utils/scripting";
import { isMobile } from "./utils/isMobile";
import { map_storage_url } from "./utils/urls";
import setFrontEnvVars from "./utils/setFrontEnvVars";

test.use({
    baseURL: map_storage_url,
});

const TOUR_ID = "wa.mapEditor.furniture";
const TUTORIAL_ID = "wa.tutorial";
const ANNOUNCEMENT_ID = "wa.announcement.tours";
/**
 * The built-in items that start by themselves at load. A test marks over the ones it does not test: one still pending
 * would start first and set off the quiet period. A new built-in announcement goes in here.
 */
const AT_LOAD = [TUTORIAL_ID, ANNOUNCEMENT_ID];

interface OnboardingState {
    firstVisit: string;
    items: Record<string, { status: string; at: string }>;
    used: string[];
}

function localDateDaysAgo(days: number): string {
    const date = new Date(Date.now() - days * 86_400_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function readOnboardingState(page: Page): Promise<OnboardingState | undefined> {
    return evaluateScript(page, async () => {
        await WA.onInit();
        return WA.player.state.onboarding as OnboardingState | undefined;
    });
}

/** The `AT_LOAD` items but `except`, recorded as done. */
function overBut(except?: string): OnboardingState["items"] {
    const at = new Date().toISOString();
    return Object.fromEntries(AT_LOAD.filter((id) => id !== except).map((id) => [id, { status: "done", at }]));
}

/**
 * Replaces the user's onboarding state, and reloads so that the front reads it. The state is a persisted player
 * variable: the reload is retried until the server has it.
 */
async function reloadWithState(page: Page, state: OnboardingState, tutorialDone = true) {
    await expect(async () => {
        await evaluateScript(
            page,
            async ({ state, tutorialDone }) => {
                const options = { public: false, persist: true, scope: "world" } as const;
                await WA.player.state.saveVariable("onboarding", state, options);
                await WA.player.state.saveVariable("tutorialDone", tutorialDone, options);
            },
            { state, tutorialDone },
        );
        await page.reload();
        await Menu.waitForMapLoad(page);
        expect((await readOnboardingState(page))?.firstVisit).toBe(state.firstVisit);
    }).toPass({ timeout: 60_000 });
}

/** CI turns the tutorial off for every spec (`ENABLE_TUTORIAL=false`): this turns it back on in the room's metadata. */
async function enableTutorial(page: Page) {
    await page.route(/\/map\?/, async (route) => {
        const response = await route.fetch();
        const json = (await response.json()) as { metadata?: Record<string, unknown> };
        await route.fulfill({ response, json: { ...json, metadata: { ...json.metadata, enableTutorial: true } } });
    });
}

/** Starts the user's onboarding over, as if their first visit to the world was `days` ago. */
async function reloadWithFirstVisit(page: Page, days: number) {
    await reloadWithState(page, { firstVisit: localDateDaysAgo(days), items: overBut(), used: [] });
}

test.describe("Onboarding @oidc @nomobile @nowebkit", () => {
    test.beforeEach(({ page, browserName }) => {
        test.skip(isMobile(page), "The map editor tour is for desktop");
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
    });

    test("The map editor tour leads an editor from the Tools menu to the entity list", async ({ browser, request }) => {
        // The tour runs on the editable "empty" map, which a fresh stack does not have yet.
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"), {
            // Tours start as soon as their target is on screen, instead of after the 30 s a user spends in the world.
            pageCreatedHook: (newPage) => setFrontEnvVars(newPage, { ONBOARDING_START_DELAY: 0 }),
            keepOnboardingTips: true,
        });
        const popover = page.getByTestId("onboarding-popover");

        // On the first day, the tour waits.
        await reloadWithFirstVisit(page, 0);
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(2000);
        await expect(popover).toBeHidden();

        await reloadWithFirstVisit(page, 1);
        await expect(popover).toContainText("Open the Tools menu");
        await expect(page.getByTestId("map-menu").locator("[data-onboarding-highlight]")).toBeVisible();

        await page.getByTestId("map-menu").click();
        await expect(popover).toContainText("Click Map editor");
        await expect(page.getByRole("button", { name: "Map editor" })).toHaveAttribute("data-onboarding-highlight");

        // Closing the menu takes the tour back to the button that opens it.
        await page.getByTestId("map-menu").click();
        await expect(popover).toContainText("Open the Tools menu");

        await page.getByTestId("map-menu").click();
        await page.getByRole("button", { name: "Map editor" }).click();
        await expect(popover).toContainText("Place furniture");
        await popover.getByTestId("onboarding-popover-next").click();
        await expect(popover).toBeHidden();
        await expect.poll(async () => (await readOnboardingState(page))?.items[TOUR_ID]?.status).toBe("done");

        // The Help menu replays it, and Esc dismisses it.
        await Menu.closeMapEditor(page);
        await Menu.openMenu(page);
        await page.getByRole("button", { name: "All settings" }).click();
        await page.getByRole("button", { name: "Help & tutorials" }).click();
        await page.getByTestId(`onboarding-help-${TOUR_ID}`).click();
        await expect(popover).toContainText("Open the Tools menu");
        await page.keyboard.press("Escape");
        await expect(popover).toBeHidden();
        await expect.poll(async () => (await readOnboardingState(page))?.items[TOUR_ID]?.status).toBe("dismissed");
    });

    test("The tutorial starts at load, and points at the buttons of a fake bubble", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"), {
            pageCreatedHook: enableTutorial,
            keepOnboardingTips: true,
        });
        const modal = page.getByTestId("onboarding-modal");
        const popover = page.getByTestId("onboarding-popover");

        // A user who has not done the tutorial yet. The start delay stays the default 30 s.
        await reloadWithState(page, { firstVisit: localDateDaysAgo(2), items: overBut(TUTORIAL_ID), used: [] }, false);
        await expect(modal).toContainText("Welcome to", { timeout: 10_000 });
        await modal.getByTestId("onboarding-modal-next").click();

        await expect(page.getByRole("heading", { name: "Move around" })).toBeVisible();
        await Map.walkTo(page, "ArrowRight", 500);
        await page.getByRole("button", { name: "Got it!" }).click();

        // The clicks do not reach the real buttons: the lock turns the fake bubble red, and no screen share starts.
        await expect(popover).toContainText("Lock your conversation");
        await page.getByTestId("lock-button").click();
        await Menu.expectButtonState(page, "lock-button", "forbidden");
        await expect(popover).toContainText("Share your screen");
        await page.getByTestId("screenShareButton").click();
        await expect(popover).toContainText("Picture in Picture");
        await page.getByTestId("pictureInPictureButton").click();

        await expect(modal).toContainText("You're all set");
        await modal.getByTestId("onboarding-modal-next").click();
        await expect(modal).toBeHidden();
        await expect.poll(async () => (await readOnboardingState(page))?.items[TUTORIAL_ID]?.status).toBe("done");
        // Map scripts still read tutorialDone.
        await expect
            .poll(() =>
                evaluateScript(page, async () => {
                    await WA.onInit();
                    return WA.player.state.tutorialDone;
                }),
            )
            .toBe(true);
        // The fake user and its bubble left with the tutorial.
        await expect(page.getByTestId("lock-button")).toBeHidden();
    });

    test("An announcement shows at load to an existing user", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"), { keepOnboardingTips: true });
        const modal = page.getByTestId("onboarding-modal");

        // The start delay stays the default 30 s: an announcement does not wait for it.
        await reloadWithState(page, { firstVisit: localDateDaysAgo(2), items: overBut(ANNOUNCEMENT_ID), used: [] });
        await expect(modal).toContainText("Tips and guided tours", { timeout: 10_000 });
        await modal.getByTestId("onboarding-modal-next").click();
        await expect(modal).toBeHidden();
        await expect.poll(async () => (await readOnboardingState(page))?.items[ANNOUNCEMENT_ID]?.status).toBe("done");
    });
});
