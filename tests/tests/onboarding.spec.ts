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

interface OnboardingState {
    firstVisit: string;
    items: Record<string, { status: string }>;
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

/**
 * Starts the user's onboarding over, as if their first visit to the world was `days` ago, and reloads so that the
 * front reads it. The state is a persisted player variable: the reload is retried until the server has it.
 */
async function reloadWithFirstVisit(page: Page, days: number) {
    const firstVisit = localDateDaysAgo(days);
    await expect(async () => {
        await evaluateScript(
            page,
            async (state) => {
                await WA.player.state.saveVariable("onboarding", state, {
                    public: false,
                    persist: true,
                    scope: "world",
                });
            },
            { firstVisit, items: {}, used: [] },
        );
        await page.reload();
        await Menu.waitForMapLoad(page);
        expect((await readOnboardingState(page))?.firstVisit).toBe(firstVisit);
    }).toPass({ timeout: 60_000 });
}

test.describe("Onboarding tours @oidc @nomobile @nowebkit", () => {
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
});
