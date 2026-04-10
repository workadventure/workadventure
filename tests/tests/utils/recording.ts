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

interface RecordingSpacePickerRowSnapshot {
    action: RecordingSpacePickerAction | null;
    disabled: boolean | null;
    kind: RecordingSpacePickerKind | null;
    label: string | null;
    status: string | null;
}

interface RecordingSpacePickerSnapshot {
    pickerVisible: boolean;
    rows: RecordingSpacePickerRowSnapshot[];
    stopButtonEnabled: boolean;
    stopButtonVisible: boolean;
}

type RecordingSpacePickerExpectedActions = Partial<Record<RecordingSpacePickerKind, RecordingSpacePickerAction>>;

function recordingSpacePicker(page: Page) {
    return page.getByTestId("recording-space-picker");
}

function recordingSpacePickerRow(page: Page, kind: RecordingSpacePickerKind) {
    const picker = recordingSpacePicker(page);

    return picker
        .getByTestId("recording-space-option")
        .filter({ has: page.getByTestId(`recording-space-kind-${kind}`) });
}

function recordingSpacePickerButton(page: Page, kind: RecordingSpacePickerKind, action: RecordingSpacePickerAction) {
    return recordingSpacePickerRow(page, kind).getByTestId(`recording-space-action-${action}`);
}

export async function clickRecordingSpacePickerAction(
    page: Page,
    kind: RecordingSpacePickerKind,
    action: RecordingSpacePickerAction,
) {
    await waitForRecordingSpacePickerActions(page, { [kind]: action });
    await recordingSpacePickerButton(page, kind, action).click();
}

export async function expectRecordingSpacePickerAction(
    page: Page,
    kind: RecordingSpacePickerKind,
    action: RecordingSpacePickerAction,
) {
    await waitForRecordingSpacePickerActions(page, { [kind]: action });
}

/**
 * Waits until both megaphone and discussion rows expose enabled stop actions in the space picker.
 * The picker is opened to assert, then closed so callers can use {@link openRecordingSpacePicker} next.
 */
export async function waitForDualRecordingStopControls(page: Page) {
    const stopButton = page.getByTestId("recordingButton-stop");
    const picker = recordingSpacePicker(page);

    await expect(stopButton).toBeVisible({ timeout: 30_000 });
    await expect(stopButton).toBeEnabled({ timeout: 30_000 });
    await waitForRecordingSpacePickerActions(
        page,
        {
            megaphone: "stop",
            discussion: "stop",
        },
        {
            actionMode: "stop",
            message: "Timed out waiting for both megaphone and discussion recordings to expose stop controls.",
            timeoutMs: 60_000,
        },
    );

    if (await picker.isVisible().catch(() => false)) {
        await stopButton.click();
        await expect(picker).toBeHidden();
    }
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

async function getRecordingSpacePickerSnapshot(page: Page): Promise<RecordingSpacePickerSnapshot> {
    const stopButton = page.getByTestId("recordingButton-stop");
    const picker = recordingSpacePicker(page);
    const pickerVisible = await picker.isVisible().catch(() => false);

    return {
        pickerVisible,
        rows: pickerVisible
            ? await picker.getByTestId("recording-space-option").evaluateAll((options) =>
                  options.map((option) => {
                      const kindElement = option.querySelector("[data-testid^='recording-space-kind-']");
                      const actionButton = option.querySelector<HTMLButtonElement>(
                          "[data-testid^='recording-space-action-']",
                      );
                      const spans = Array.from(option.querySelectorAll("span"));
                      const kindTestId = kindElement?.getAttribute("data-testid");
                      const actionTestId = actionButton?.getAttribute("data-testid");

                      return {
                          action:
                              actionTestId === "recording-space-action-start"
                                  ? "start"
                                  : actionTestId === "recording-space-action-stop"
                                    ? "stop"
                                    : null,
                          disabled: actionButton?.disabled ?? null,
                          kind:
                              kindTestId === "recording-space-kind-discussion"
                                  ? "discussion"
                                  : kindTestId === "recording-space-kind-megaphone"
                                    ? "megaphone"
                                    : null,
                          label: kindElement?.textContent?.trim() ?? null,
                          status: spans[1]?.textContent?.trim() ?? null,
                      };
                  }),
              )
            : [],
        stopButtonEnabled: await stopButton.isEnabled().catch(() => false),
        stopButtonVisible: await stopButton.isVisible().catch(() => false),
    };
}

function formatRecordingSpacePickerSnapshot(snapshot: RecordingSpacePickerSnapshot): string {
    const rows = snapshot.rows.length
        ? snapshot.rows
              .map((row) => {
                  const kind = row.kind ?? "unknown";
                  const action = row.action ?? "none";
                  const disabled = row.disabled === null ? "unknown" : String(row.disabled);
                  const label = row.label ?? "n/a";
                  const status = row.status ?? "n/a";

                  return `${kind}: label="${label}", status="${status}", action=${action}, disabled=${disabled}`;
              })
              .join(" | ")
        : "no visible rows";

    return `pickerVisible=${snapshot.pickerVisible}, stopButtonVisible=${snapshot.stopButtonVisible}, stopButtonEnabled=${snapshot.stopButtonEnabled}, rows=${rows}`;
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

    await expect
        .poll(
            async () => {
                const snapshot = await getRecordingSpacePickerSnapshot(page);

                return hasRecordingSpacePickerActions(snapshot, expectedActions)
                    ? "ready"
                    : formatRecordingSpacePickerSnapshot(snapshot);
            },
            {
                message:
                    options.message ??
                    `Timed out waiting for recording space picker actions: ${formatExpectedRecordingSpacePickerActions(expectedActions)}.`,
                timeout: options.timeoutMs ?? 30_000,
            },
        )
        .toBe("ready");
}

function hasRecordingSpacePickerActions(
    snapshot: RecordingSpacePickerSnapshot,
    expectedActions: RecordingSpacePickerExpectedActions,
): boolean {
    if (!snapshot.pickerVisible) {
        return false;
    }

    return Object.entries(expectedActions).every(([kind, action]) => {
        const row = snapshot.rows.find((candidate) => candidate.kind === kind);

        return row?.action === action && row.disabled === false;
    });
}

function formatExpectedRecordingSpacePickerActions(expectedActions: RecordingSpacePickerExpectedActions): string {
    return Object.entries(expectedActions)
        .map(([kind, action]) => `${kind}=${action}`)
        .join(", ");
}
