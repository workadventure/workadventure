import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function waitForRecordingToAppear(page: Page, index: number, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
        let retry = false;
        try {
            await expect(page.getByTestId(`recording-item-${index}`)).toBeVisible({ timeout: 5000 });
        } catch {
            // If this fails, nothing to do, we will retry
            retry = true;
        }

        if (!retry) {
            break;
        }

        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(6000);
        await page.getByRole("button", { name: "Refresh" }).click();
    }
}

export async function deleteAllRecordings(page: Page) {
    await page.getByTestId("apps-button").click();

    // Ensure list view so delete buttons are directly visible (no need to open actions panel)
    await page.evaluate(() => localStorage.setItem("wa-recordings-view-mode", "list"));
    await page.getByTestId("recordingButton-list").click();

    while (
        // eslint-disable-next-line playwright/no-conditional-expect,playwright/missing-playwright-await
        await expect(page.getByTestId("recording-item-0"))
            .toBeVisible({ timeout: 3000 })
            .then(() => true)
            .catch(() => false)
    ) {
        await page.getByTestId("recording-delete-0").click();
        await expect(page.getByText("Recording deleted successfully")).toBeVisible();
        await expect(page.getByText("Recording deleted successfully")).toBeHidden();
    }

    await page.getByTestId("close-recording-modal").click();
}

export async function closeRecordingCompletedToast(page: Page) {
    const completedToast = page.getByTestId("recording-completed-modal");
    await expect(completedToast).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(completedToast).toBeHidden();
}

type RecordingSpacePickerKind = "discussion" | "megaphone";
type RecordingSpacePickerAction = "start" | "stop";

function recordingSpacePickerButton(page: Page, kind: RecordingSpacePickerKind, action: RecordingSpacePickerAction) {
    const picker = page.getByTestId("recording-space-picker");
    const kindLabel = kind === "megaphone" ? "Megaphone" : "Discussion";
    const actionLabel = action === "stop" ? "Stop" : "Start";

    return picker
        .getByTestId(/recording-space-option-\d+/)
        .filter({ has: page.getByText(kindLabel, { exact: true }) })
        .getByRole("button", { name: actionLabel, exact: true });
}

export async function clickRecordingSpacePickerAction(
    page: Page,
    kind: RecordingSpacePickerKind,
    action: RecordingSpacePickerAction,
) {
    await recordingSpacePickerButton(page, kind, action).click();
}

export async function expectRecordingSpacePickerAction(
    page: Page,
    kind: RecordingSpacePickerKind,
    action: RecordingSpacePickerAction,
) {
    await expect(recordingSpacePickerButton(page, kind, action)).toBeEnabled();
}

export async function openRecordingSpacePicker(page: Page, action: RecordingSpacePickerAction) {
    await page.getByTestId(`recordingButton-${action}`).click();
    await expect(page.getByTestId("recording-space-picker")).toBeVisible();
}

export async function waitForMegaphoneToBeStreaming(page: Page) {
    // The modal must remain open: closing it resets the local streaming megaphone state.
    await expect(page.getByRole("button", { name: "Stop megaphone" })).toBeVisible();
}
