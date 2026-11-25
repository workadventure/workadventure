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
const LOCK_TIP_ID = "wa.tip.lockBubble";
const TUTORIAL_ID = "wa.tutorial";
const ANNOUNCEMENT_ID = "wa.announcement.v1.35";
/**
 * The built-in items that start by themselves at load. A test marks over the ones it does not test: one still pending
 * would start first and set off the quiet period. A new built-in announcement goes in here.
 */
const AT_LOAD = [TUTORIAL_ID, ANNOUNCEMENT_ID];

interface OnboardingState {
    firstVisit: string;
    items: Record<string, { status: string; at: string }>;
    used: string[];
    requested?: string[];
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

/** The `AT_LOAD` items but `except`, and the `others`, recorded as done. */
function overBut(except?: string, others: string[] = []): OnboardingState["items"] {
    const at = new Date().toISOString();
    const ids = [...AT_LOAD.filter((id) => id !== except), ...others];
    return Object.fromEntries(ids.map((id) => [id, { status: "done", at }]));
}

/**
 * Replaces the user's onboarding state and `tutorialDone`, and reloads so that the front reads them. They are persisted
 * player variables: the reload is retried until the server has both.
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
        // Both: a reload can land between the two writes.
        const saved = await evaluateScript(page, async () => {
            await WA.onInit();
            const onboarding = WA.player.state.onboarding as OnboardingState | undefined;
            return { firstVisit: onboarding?.firstVisit, tutorialDone: WA.player.state.tutorialDone };
        });
        expect(saved).toEqual({ firstVisit: state.firstVisit, tutorialDone });
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

    test("The tutorial starts at load, and shows a fake bubble", async ({ browser, request }) => {
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
        // A fake user walks up: the popover points at their video.
        await expect(popover).toContainText("Communication bubbles", { timeout: 20_000 });
        await expect(page.locator(".camera-box[data-onboarding-highlight]")).toBeVisible();
        await popover.getByTestId("onboarding-popover-next").click();

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
    });

    test("An announcement shows at load to an existing user", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"), { keepOnboardingTips: true });
        const modal = page.getByTestId("onboarding-modal");

        // The start delay stays the default 30 s: an announcement does not wait for it.
        await reloadWithState(page, { firstVisit: localDateDaysAgo(2), items: overBut(ANNOUNCEMENT_ID), used: [] });
        await expect(modal).toContainText("What's new in WorkAdventure 1.35", { timeout: 10_000 });
        // The video written in the Markdown plays by itself, muted.
        const video = modal.locator("video");
        await expect(video).toHaveJSProperty("muted", true);
        await expect(video).toHaveJSProperty("paused", false);

        // A `---` line in the Markdown starts a new page.
        const next = modal.getByTestId("onboarding-modal-next");
        await expect(modal).not.toContainText("A desktop app");
        await expect(modal.getByTestId("onboarding-modal-previous")).toBeHidden();
        await next.click();
        await expect(modal).toContainText("A desktop app");
        await modal.getByTestId("onboarding-modal-previous").click();
        await expect(modal).toContainText("Drag the map to look around");
        await next.click();
        await expect(next).toHaveText("Got it");

        // A link in the same tab would take the user out of the world.
        await expect(modal.getByRole("link", { name: "full release notes" })).toHaveAttribute("target", "_blank");
        // On a short window, the body scrolls and the button stays in view.
        await page.setViewportSize({ width: 1280, height: 480 });
        await expect(next).toBeInViewport({ ratio: 1 });
        await next.click();
        await expect(modal).toBeHidden();
        await expect.poll(async () => (await readOnboardingState(page))?.items[ANNOUNCEMENT_ID]?.status).toBe("done");
    });

    test("The tip on the lock button shows in a bubble, from the day after the first visit", async ({
        browser,
        request,
    }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"), {
            pageCreatedHook: (newPage) => setFrontEnvVars(newPage, { ONBOARDING_START_DELAY: 0 }),
            keepOnboardingTips: true,
        });
        const popover = page.getByTestId("onboarding-popover");

        // The map editor tour would start first, on the Tools menu, and the other tips of the bubble could.
        await reloadWithState(page, {
            firstVisit: localDateDaysAgo(1),
            items: overBut(undefined, [TOUR_ID, "wa.tip.screenShare", "wa.tip.pictureInPicture"]),
            used: [],
        });
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);
        // Out of a bubble, there is no lock button to point at.
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(2000);
        await expect(popover).toBeHidden();

        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 5 * 32, 5 * 32);
        await expect(popover).toContainText("Lock your conversation", { timeout: 30_000 });
        await expect(page.getByTestId("lock-button")).toHaveAttribute("data-onboarding-highlight");
        // Locking the bubble closes the tip as done, as its "Got it" button would.
        await page.getByTestId("lock-button").click();
        await expect(popover).toBeHidden();
        await Menu.expectButtonState(page, "lock-button", "forbidden");
        await expect.poll(async () => (await readOnboardingState(page))?.items[LOCK_TIP_ID]?.status).toBe("done");
    });

    test("A tip of the Help menu that cannot start here starts in the next bubble, if the user asks for it", async ({
        browser,
        request,
    }) => {
        await resetWamMaps(request);
        await using page = await getPage(browser, "Admin1", Map.url("empty"), { keepOnboardingTips: true });
        const popover = page.getByTestId("onboarding-popover");

        // Over: the tip would never start by itself again.
        await reloadWithState(page, {
            firstVisit: localDateDaysAgo(1),
            items: overBut(undefined, [TOUR_ID, LOCK_TIP_ID, "wa.tip.screenShare", "wa.tip.pictureInPicture"]),
            used: [],
        });
        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        // Out of a bubble, the Help menu lists it greyed out, with where its button shows up.
        await Menu.openMenu(page);
        await page.getByRole("button", { name: "All settings" }).click();
        await page.getByRole("button", { name: "Help & tutorials" }).click();
        await expect(page.getByTestId(`onboarding-help-${LOCK_TIP_ID}`)).toContainText("During a conversation");
        const remind = page.getByTestId(`onboarding-help-remind-${LOCK_TIP_ID}`);
        await expect(remind).toHaveAttribute("aria-pressed", "false");
        await remind.click();
        await expect(remind).toHaveAttribute("aria-pressed", "true");
        await expect.poll(async () => (await readOnboardingState(page))?.requested).toEqual([LOCK_TIP_ID]);
        await page.locator("#closeMenu").click();

        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 5 * 32, 5 * 32);
        await expect(popover).toContainText("Lock your conversation", { timeout: 30_000 });
        await expect.poll(async () => (await readOnboardingState(page))?.requested).toBeUndefined();
    });
});
