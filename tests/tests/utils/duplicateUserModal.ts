import type { Page } from "@playwright/test";
import { dismissOnboardingIfShown } from "./onboarding";

const DUPLICATE_USER_DONT_REMIND_KEY = "workadventure_duplicate_user_dont_remind";

export async function preventDuplicateUserConnectedModal(page: Page): Promise<void> {
    await page.addInitScript((key) => {
        localStorage.setItem(key, "1");
    }, DUPLICATE_USER_DONT_REMIND_KEY);

    await page
        .evaluate((key) => {
            localStorage.setItem(key, "1");
        }, DUPLICATE_USER_DONT_REMIND_KEY)
        .catch(() => undefined);
}

async function clickDuplicateUserContinue(page: Page, dontRemindAgain: boolean): Promise<boolean> {
    const confirm = page.getByTestId("duplicate-user-confirm-continue");
    const dontRemindCheckbox = page.getByTestId("duplicate-user-dont-remind-again");

    if (!(await confirm.isVisible().catch(() => false))) {
        return false;
    }

    if (dontRemindAgain && (await dontRemindCheckbox.isVisible().catch(() => false))) {
        await dontRemindCheckbox.evaluate((element: HTMLInputElement) => {
            if (!element.checked) {
                element.click();
            }
        });
    }

    await confirm.evaluate((element: HTMLElement) => element.click());
    await confirm.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => undefined);

    return true;
}

export async function installDuplicateUserConnectedModalHandler(
    page: Page,
    dontRemindAgain: boolean = false,
): Promise<void> {
    await page.addLocatorHandler(page.getByTestId("duplicate-user-confirm-continue"), async () => {
        await clickDuplicateUserContinue(page, dontRemindAgain);
    });
}

/**
 * After the room connection is established, the "already connected in another tab" modal may appear.
 * Waits until that screen, the game (microphone), or an error message is visible; if the duplicate-user
 * screen is shown, clicks "Continue" so tests can proceed (same pattern as `dismissPwaInstallScreenIfShown`).
 */
export async function dismissDuplicateUserConnectedModalIfShown(
    page: Page,
    dontRemindAgain: boolean = false,
): Promise<void> {
    const confirm = page.getByTestId("duplicate-user-confirm-continue");
    const microphone = page.getByTestId("microphone-button");
    const mapLoadedControls = [
        page.locator("#game canvas").first(),
        page.getByRole("button", { name: "Explore the room" }),
        page.getByTestId("action-user"),
        page.getByTestId("map-menu"),
        microphone,
    ];
    const onboardingSkip = page.getByTestId("onboarding-button-welcome-skip");
    const errorOccurred = page.getByText("An error occurred").first();

    for (let attempt = 0; attempt < 2; attempt++) {
        const visibleControl = await Promise.race([
            confirm.waitFor({ state: "visible", timeout: 90_000 }).then(() => "confirm" as const),
            ...mapLoadedControls.map((control) =>
                control.waitFor({ state: "visible", timeout: 90_000 }).then(() => "map" as const),
            ),
            onboardingSkip.waitFor({ state: "visible", timeout: 90_000 }).then(() => "onboarding" as const),
            errorOccurred.waitFor({ state: "visible", timeout: 90_000 }).then(() => "error" as const),
        ]).catch(() => undefined);

        if (visibleControl === undefined) {
            throw new Error(
                "Timed out waiting for duplicate-user modal, onboarding, map controls, or an error screen.",
            );
        }

        if (visibleControl === "onboarding") {
            await dismissOnboardingIfShown(page, 500);
            continue;
        }

        if (visibleControl === "confirm") {
            await clickDuplicateUserContinue(page, dontRemindAgain);
        }

        return;
    }

    throw new Error("Onboarding was still blocking duplicate-user modal handling after being dismissed twice.");
}
