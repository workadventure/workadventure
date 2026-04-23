<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { SpaceRecordingLayoutMode } from "@workadventure/messages";
    import { LL } from "../../../../i18n/i18n-svelte";

    const dispatch = createEventDispatcher<{
        confirm: SpaceRecordingLayoutMode;
        cancel: void;
    }>();

    let choice: SpaceRecordingLayoutMode = SpaceRecordingLayoutMode.GRID;

    function confirm(): void {
        dispatch("confirm", choice);
    }

    function cancel(): void {
        dispatch("cancel");
    }
</script>

<div
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4"
    data-testid="recording-layout-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="recording-layout-dialog-title"
>
    <div
        class="w-full max-w-lg rounded-lg border border-white/15 bg-contrast/95 p-5 shadow-2xl backdrop-blur-md text-white"
    >
        <h2 id="recording-layout-dialog-title" class="mb-3 text-lg font-semibold">
            {$LL.recording.actionbar.layoutPicker.title()}
        </h2>
        <p class="mb-4 text-sm text-white/75">
            {$LL.recording.actionbar.layoutPicker.subtitle()}
        </p>

        <div class="mb-5 flex flex-col gap-3">
            <label class="flex cursor-pointer flex-row gap-3 rounded border border-white/10 bg-white/5 p-3">
                <input type="radio" bind:group={choice} value={SpaceRecordingLayoutMode.GRID} class="mt-1" />
                <span>
                    <span class="block text-sm font-medium">{$LL.recording.actionbar.layoutPicker.gridLabel()}</span>
                    <span class="mt-1 block text-xs text-white/70"
                        >{$LL.recording.actionbar.layoutPicker.gridDesc()}</span
                    >
                </span>
            </label>
            <label class="flex cursor-pointer flex-row gap-3 rounded border border-white/10 bg-white/5 p-3">
                <input type="radio" bind:group={choice} value={SpaceRecordingLayoutMode.SPEAKER} class="mt-1" />
                <span>
                    <span class="block text-sm font-medium">{$LL.recording.actionbar.layoutPicker.speakerLabel()}</span>
                    <span class="mt-1 block text-xs text-white/70"
                        >{$LL.recording.actionbar.layoutPicker.speakerDesc()}</span
                    >
                </span>
            </label>
            <label class="flex cursor-pointer flex-row gap-3 rounded border border-white/10 bg-white/5 p-3">
                <input type="radio" bind:group={choice} value={SpaceRecordingLayoutMode.FULLSCREEN} class="mt-1" />
                <span>
                    <span class="block text-sm font-medium"
                        >{$LL.recording.actionbar.layoutPicker.fullscreenLabel()}</span
                    >
                    <span class="mt-1 block text-xs text-white/70"
                        >{$LL.recording.actionbar.layoutPicker.fullscreenDesc()}</span
                    >
                </span>
            </label>
        </div>

        <div class="flex flex-row justify-end gap-2">
            <button
                type="button"
                class="rounded border border-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
                data-testid="recording-layout-cancel"
                on:click={cancel}
            >
                {$LL.recording.actionbar.layoutPicker.cancel()}
            </button>
            <button
                type="button"
                class="rounded bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500"
                data-testid="recording-layout-confirm"
                on:click={confirm}
            >
                {$LL.recording.actionbar.layoutPicker.confirm()}
            </button>
        </div>
    </div>
</div>
