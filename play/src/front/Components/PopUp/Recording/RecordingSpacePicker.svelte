<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Readable } from "svelte/store";
    import { clickOutside } from "svelte-outside";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { RecordingSpaceRow } from "../../ActionBar/MenuIcons/RecordingMenuUtils";

    export let rowsStore: Readable<RecordingSpaceRow[]>;
    export let onSelect: (row: RecordingSpaceRow) => void;
    export let onClose: (() => void) | undefined = undefined;

    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    function handleClose(): void {
        dispatch("close");
        onClose?.();
    }

    function handleSelect(row: RecordingSpaceRow): void {
        if (row.disabled || !row.action) {
            return;
        }

        onSelect(row);
        handleClose();
    }

    function getStatusLabel(row: RecordingSpaceRow): string {
        switch (row.status) {
            case "starting":
                return `${$LL.recording.actionbar.title.start()}...`;
            case "stopping":
                return `${$LL.recording.actionbar.title.stop()}...`;
            case "recording-self":
                return $LL.recording.actionbar.desc.yourRecordInProgress();
            case "recording-other":
                return row.recorderName
                    ? $LL.recording.notification.recordingStarted({ name: row.recorderName })
                    : $LL.notification.recordingStarted();
            case "available":
                return $LL.recording.actionbar.desc.advert();
        }
    }

    function getActionLabel(row: RecordingSpaceRow): string {
        return row.action === "stop" ? $LL.recording.actionbar.title.stop() : $LL.recording.actionbar.title.start();
    }

    function getKindTestId(row: RecordingSpaceRow): string {
        return `recording-space-kind-${row.kind}`;
    }

    function getActionTestId(row: RecordingSpaceRow): string {
        return `recording-space-action-${row.action}`;
    }

    function getRowTestId(row: RecordingSpaceRow): string {
        return `recording-space-row-${row.kind}`;
    }
</script>

<div
    data-testid="recording-space-picker"
    class="bg-contrast/80 backdrop-blur-md rounded-md shadow-lg p-2 max-w-96 overflow-auto flex flex-col gap-2"
    use:clickOutside={handleClose}
>
    {#each $rowsStore as row (row.spaceName)}
        <div
            class="w-full rounded border border-white/10 bg-white/5 p-3 flex flex-row items-center gap-3 {row.disabled ||
            !row.action
                ? 'opacity-80'
                : ''}"
            data-testid={getRowTestId(row)}
        >
            <div class="min-w-0 flex-1 flex flex-col gap-1">
                <span class="text-sm font-semibold text-white" data-testid={getKindTestId(row)}>
                    {row.kind === "megaphone"
                        ? $LL.recording.actionbar.spacePicker.megaphone()
                        : $LL.recording.actionbar.spacePicker.discussion()}
                </span>
                <span class="text-xs text-white/70">{getStatusLabel(row)}</span>
            </div>

            {#if row.action}
                <button
                    type="button"
                    data-testid={getActionTestId(row)}
                    class="shrink-0 rounded border px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 {row.action ===
                    'stop'
                        ? 'border-red-400/60 text-red-200 hover:bg-red-500/10'
                        : 'border-white/20 text-white hover:bg-white/10'}"
                    disabled={row.disabled}
                    on:click={() => handleSelect(row)}
                >
                    {getActionLabel(row)}
                </button>
            {/if}
        </div>
    {/each}
</div>
