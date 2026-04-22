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
        await page.getByRole("button", { name: "Refresh", exact: true }).click();
    }
}

export async function deleteAllRecordings(page: Page) {
    await page.getByTestId("apps-button").click();

    // Ensure list view so delete buttons are directly visible (no need to open actions panel)
    await page.evaluate(() => localStorage.setItem("wa-recordings-view-mode", "list"));
    await page.getByTestId("recordingButton-list").click();

    while (
        // eslint-disable-next-line playwright/no-conditional-expect
        await expect(page.getByTestId("recording-item-0"))
            .toBeVisible({ timeout: 3000 })
            .then(() => true)
            .catch(() => false)
    ) {
        await page.getByTestId("recording-delete-0").click();
        const deleteToast = page.getByText("Recording deleted successfully").last();
        await expect(deleteToast).toBeVisible();
        await expect(deleteToast).toBeHidden();
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

type RecordingSpacePickerExpectedActions = Partial<Record<RecordingSpacePickerKind, RecordingSpacePickerAction>>;

function recordingSpacePicker(page: Page) {
    return page.getByTestId("recording-space-picker");
}

function recordingSpacePickerRow(page: Page, kind: RecordingSpacePickerKind) {
    return recordingSpacePicker(page).getByTestId(`recording-space-row-${kind}`);
}

function recordingSpacePickerButton(page: Page, kind: RecordingSpacePickerKind, action: RecordingSpacePickerAction) {
    return recordingSpacePickerRow(page, kind).getByTestId(`recording-space-action-${action}`);
}

export async function clickRecordingSpacePickerAction(
    page: Page,
    kind: RecordingSpacePickerKind,
    action: RecordingSpacePickerAction,
) {
    const picker = recordingSpacePicker(page);

    await waitForRecordingSpacePickerActions(page, { [kind]: action });
    await recordingSpacePickerButton(page, kind, action).click();
    await expect(picker).toBeHidden({ timeout: 5_000 });
}

export async function expectRecordingSpacePickerAction(
    page: Page,
    kind: RecordingSpacePickerKind,
    action: RecordingSpacePickerAction,
) {
    await waitForRecordingSpacePickerActions(page, { [kind]: action });
}

type DualRecordingStopWaitResult = "continue" | "done";

/**
 * After starting megaphone + discussion recordings, waits until both rows show an enabled stop action.
 * Rows can sit in transient states (no action button, or "start" still visible); this polls with the same
 * gestures a user would use: open the stop picker, optionally press discussion "start" again, otherwise
 * dismiss the floating picker via the action-bar control and reopen on the next attempt.
 */
export async function waitForDualRecordingStopControls(page: Page) {
    const stopButton = page.getByTestId("recordingButton-stop");
    const picker = recordingSpacePicker(page);

    await expect(stopButton).toBeVisible({ timeout: 30_000 });
    await expect(stopButton).toBeEnabled({ timeout: 30_000 });

    await expect
        .poll(
            async (): Promise<DualRecordingStopWaitResult> => {
                await ensureRecordingSpacePickerOpen(page, "stop");

                const discussionStart = recordingSpacePickerRow(page, "discussion").getByTestId(
                    "recording-space-action-start",
                );

                if (await discussionStart.isEnabled({ timeout: 2_000 }).catch(() => false)) {
                    await discussionStart.click();
                    await expect(picker).toBeHidden({ timeout: 5_000 });
                    return "continue";
                }

                const megaphoneStop = recordingSpacePickerRow(page, "megaphone").getByTestId(
                    "recording-space-action-stop",
                );
                const discussionStop = recordingSpacePickerRow(page, "discussion").getByTestId(
                    "recording-space-action-stop",
                );

                const megaphoneReady = await megaphoneStop.isEnabled({ timeout: 2_000 }).catch(() => false);
                const discussionReady = await discussionStop.isEnabled({ timeout: 2_000 }).catch(() => false);

                if (megaphoneReady && discussionReady) {
                    return "done";
                }

                await stopButton.click();
                await expect(picker).toBeHidden({ timeout: 5_000 });
                return "continue";
            },
            {
                message:
                    "Timed out waiting for megaphone and discussion rows to expose enabled stop actions in the picker.",
                timeout: 60_000,
                intervals: [250, 500, 1_000, 1_500, 2_000],
            },
        )
        .toBe("done");

    await stopButton.click();
    await expect(picker).toBeHidden();
}

export async function openRecordingSpacePicker(page: Page, action: RecordingSpacePickerAction) {
    await ensureRecordingSpacePickerOpen(page, action);
}

export async function waitForMegaphoneToBeStreaming(page: Page) {
    // The modal must remain open: closing it resets the local streaming megaphone state.
    await expect(page.getByRole("button", { name: "Stop megaphone" })).toBeVisible();
}

async function ensureRecordingSpacePickerOpen(page: Page, action: RecordingSpacePickerAction) {
    const picker = recordingSpacePicker(page);

    if (await picker.isVisible().catch(() => false)) {
        return;
    }

    await page.getByTestId(`recordingButton-${action}`).click();
    await expect(picker).toBeVisible();
}

async function waitForRecordingSpacePickerActions(
    page: Page,
    expectedActions: RecordingSpacePickerExpectedActions,
    options: {
        actionMode?: RecordingSpacePickerAction;
        message?: string;
        timeoutMs?: number;
    } = {},
) {
    if (options.actionMode) {
        await ensureRecordingSpacePickerOpen(page, options.actionMode);
    }

    const timeout = options.timeoutMs ?? 30_000;
    const entries = Object.entries(expectedActions) as [RecordingSpacePickerKind, RecordingSpacePickerAction][];

    await Promise.all(
        entries.map(([kind, action]) =>
            expect(
                recordingSpacePickerRow(page, kind).getByTestId(`recording-space-action-${action}`),
                options.message ??
                    `Recording space "${kind}" should expose an enabled "${action}" control in the picker.`,
            ).toBeEnabled({ timeout }),
        ),
    );
}
