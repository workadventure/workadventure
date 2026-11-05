<script lang="ts">
    import type { RecordingProduction, RecordingZoom } from "@workadventure/shared-utils";
    import { RECORDING_MAX_PINS } from "@workadventure/shared-utils";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { SpaceInterface } from "../../../Space/SpaceInterface";
    import { RECORDER_LAYOUT_MODES, RECORDER_MAX_TILES } from "../../../Utils/RecorderLayout";

    // The producer panel: the person recording over the map directs it live. The ?recorder page applies each change
    // within a second (see RecorderDirector).
    interface Props {
        space: SpaceInterface;
    }

    let { space }: Props = $props();

    const recording = $derived(space.state.observe("recording"));
    const production = $derived($recording.production);
    const users = $derived(space.usersStore);
    const ZOOMS: RecordingZoom[] = ["tight", "wide", "whole"];

    function change(update: Partial<RecordingProduction>): void {
        if (!production) return;
        space.state.setRecordingProduction({ ...production, ...update }).catch((error) => {
            console.error("Could not change the recording", error);
        });
    }

    // Half of the tiles at most: the others still follow who speaks.
    const maxPins = $derived(
        production ? Math.min(RECORDING_MAX_PINS, Math.floor(RECORDER_MAX_TILES[production.layout] / 2)) : 0,
    );

    function togglePin(spaceUserId: string): void {
        if (!production) return;
        const pins = production.pins.includes(spaceUserId)
            ? production.pins.filter((id) => id !== spaceUserId)
            : [...production.pins, spaceUserId].slice(-maxPins);
        change({ pins });
    }

    async function frameMyView(): Promise<void> {
        // Imported on click: the panel stays free of Phaser.
        const { gameManager } = await import("../../../Phaser/Game/GameManager");
        const { x, y, width, height } = gameManager.getCurrentGameScene().cameras.main.worldView;
        change({ frame: { x, y, width, height } });
    }

    const segment =
        "flex-1 rounded px-2 py-1 text-xs font-semibold transition-colors text-white/70 hover:bg-white/10 aria-pressed:bg-secondary aria-pressed:text-white";
</script>

{#if production}
    <div class="flex flex-col gap-2 pt-2" data-testid="recording-producer-panel">
        <span class="text-xs uppercase tracking-wide text-white/60">{$LL.recording.actionbar.producer.layout()}</span>
        <div class="flex gap-1 rounded bg-white/5 p-1">
            {#each RECORDER_LAYOUT_MODES as layout (layout)}
                <button
                    type="button"
                    class={segment}
                    aria-pressed={production.layout === layout}
                    data-testid="recording-producer-layout-{layout}"
                    onclick={() => change({ layout })}>{$LL.recording.actionbar.spacePicker.layout[layout]()}</button
                >
            {/each}
        </div>

        <span class="text-xs uppercase tracking-wide text-white/60">{$LL.recording.actionbar.producer.zoom()}</span>
        <div class="flex gap-1 rounded bg-white/5 p-1">
            {#each ZOOMS as zoom (zoom)}
                <button
                    type="button"
                    class={segment}
                    aria-pressed={production.zoom === zoom && !production.frame}
                    data-testid="recording-producer-zoom-{zoom}"
                    onclick={() => change({ zoom, frame: null })}
                    >{$LL.recording.actionbar.producer.zoomLevel[zoom]()}</button
                >
            {/each}
        </div>

        <span class="text-xs uppercase tracking-wide text-white/60">{$LL.recording.actionbar.producer.framing()}</span>
        <div class="flex gap-1 rounded bg-white/5 p-1">
            <button
                type="button"
                class={segment}
                aria-pressed={!production.frame}
                data-testid="recording-producer-follow"
                onclick={() => change({ frame: null })}>{$LL.recording.actionbar.producer.follow()}</button
            >
            <button
                type="button"
                class={segment}
                aria-pressed={!!production.frame}
                data-testid="recording-producer-frame-my-view"
                onclick={() => {
                    frameMyView().catch((error) => console.error("Could not frame the recording", error));
                }}>{$LL.recording.actionbar.producer.frameMyView()}</button
            >
        </div>

        <span class="text-xs uppercase tracking-wide text-white/60">{$LL.recording.actionbar.producer.cameras()}</span>
        <div class="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {#each [...$users.values()] as user (user.spaceUserId)}
                {@const pinned = production.pins.includes(user.spaceUserId)}
                <div class="flex items-center gap-2 rounded px-2 py-1 text-xs text-white" class:bg-secondary={pinned}>
                    <span class="min-w-0 flex-1 truncate">{user.name}</span>
                    <button
                        type="button"
                        class="rounded border border-white/20 px-2 py-0.5 font-semibold hover:bg-white/10"
                        data-testid="recording-producer-pin"
                        onclick={() => togglePin(user.spaceUserId)}
                    >
                        {pinned ? $LL.recording.actionbar.producer.unpin() : $LL.recording.actionbar.producer.pin()}
                    </button>
                </div>
            {/each}
        </div>
        <span class="text-xs text-white/60">{$LL.recording.actionbar.producer.pinHint({ max: maxPins })}</span>
    </div>
{/if}
