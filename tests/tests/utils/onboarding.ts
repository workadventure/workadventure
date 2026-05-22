import type { Page } from "@playwright/test";

export async function dismissOnboardingIfShown(page: Page, timeout = 2_000): Promise<void> {
    const welcomeSkip = page.getByTestId("onboarding-button-welcome-skip");

    const isWelcomeVisible = await welcomeSkip.waitFor({ state: "visible", timeout }).then(
        () => true,
        () => false,
    );

    if (isWelcomeVisible) {
        try {
            await welcomeSkip.evaluate((element: HTMLElement) => element.click(), undefined, { timeout: 5_000 });
            await welcomeSkip.waitFor({ state: "hidden", timeout: 30_000 });
        } catch (e) {
            if (e instanceof Error && e.message.includes("Target page, context or browser has been closed")) {
                return;
            }
            if (await welcomeSkip.isHidden().catch(() => true)) {
                return;
            }
            throw e;
        }
    }
}
