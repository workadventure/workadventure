<script lang="ts">
    import type { Readable } from "svelte/store";
    import { clickOutside } from "svelte-outside";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { RecordingSpaceRow } from "../../ActionBar/MenuIcons/RecordingMenuUtils";
    import { RECORDER_LAYOUT_MODES } from "../../../Utils/RecorderLayout";
    import type { RecorderLayoutMode } from "../../../Utils/RecorderLayout";

    interface Props {
        rowsStore: Readable<RecordingSpaceRow[]>;
        // Offer to film the meeting over the live map, in one of its layouts.
        withMapAvailable?: boolean;
        // layout: over the map, in this layout. Undefined: the camera grid only.
        onselect?: (row: RecordingSpaceRow, layout: RecorderLayoutMode | undefined) => void;
        onclose?: () => void;
    }

    let { rowsStore, withMapAvailable = false, onselect, onclose = undefined }: Props = $props();

    function handleClose(): void {
        onclose?.();
    }

    function handleSelect(row: RecordingSpaceRow, layout?: RecorderLayoutMode): void {
        if (row.disabled || !row.action) {
            return;
        }

        onselect?.(row, layout);
        handleClose();
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
                <span class="text-xs text-white/70">
                    {#if row.status === "starting"}
                        {$LL.recording.actionbar.title.start()}...
                    {:else if row.status === "stopping"}
                        {$LL.recording.actionbar.title.stop()}...
                    {:else if row.status === "recording-self"}
                        {$LL.recording.actionbar.desc.yourRecordInProgress()}
                    {:else if row.status === "recording-other"}
                        {#if row.recorderName}
                            {$LL.recording.notification.recordingStarted({ name: row.recorderName })}
                        {:else}
                            {$LL.notification.recordingStarted()}
                        {/if}
                    {:else}
                        {$LL.recording.actionbar.desc.advert()}
                    {/if}
                </span>
                {#if row.action === "start" && withMapAvailable}
                    <div class="flex flex-row flex-wrap items-center gap-1 pt-1">
                        <span class="text-xs text-white/70">{$LL.recording.actionbar.spacePicker.withMap()}</span>
                        {#each RECORDER_LAYOUT_MODES as layout (layout)}
                            <button
                                type="button"
                                data-testid="recording-space-action-start-with-map-{layout}"
                                class="rounded border border-white/20 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={row.disabled}
                                onclick={() => handleSelect(row, layout)}
                            >
                                {$LL.recording.actionbar.spacePicker.layout[layout]()}
                            </button>
                        {/each}
                    </div>
                {/if}
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
                    onclick={() => handleSelect(row)}
                >
                    {row.action === "stop"
                        ? $LL.recording.actionbar.title.stop()
                        : $LL.recording.actionbar.title.start()}
                </button>
            {/if}
        </div>
    {/each}
</div>
