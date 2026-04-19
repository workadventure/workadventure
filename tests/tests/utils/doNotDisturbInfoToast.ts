import type { Page } from "@playwright/test";

/**
 * When the audio context is still suspended, the "Do not disturb" info toast may appear with an
 * "Online" action. Clicking it resumes the audio context and clears the toast (see DoNotDisturbInfoToast).
 * No-op if the toast is not shown within the timeout.
 */
export async function dismissDoNotDisturbInfoToast(page: Page, timeoutMs: number = 5_000): Promise<void> {
    const onlineButton = page.getByTestId("do-not-disturb-activate");
    const microphone = page.getByTestId("microphone-button");
    const visibleControl = await Promise.race([
        onlineButton.waitFor({ state: "visible", timeout: timeoutMs }).then(() => "online" as const),
        microphone.waitFor({ state: "visible", timeout: timeoutMs }).then(() => "microphone" as const),
    ]).catch(() => undefined);

    if (visibleControl === "online") {
        await onlineButton.click();
    }
}
