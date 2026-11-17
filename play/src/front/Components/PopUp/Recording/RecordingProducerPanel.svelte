<script lang="ts">
    import type { RecordingProduction, RecordingZoom } from "@workadventure/shared-utils";
    import { RECORDING_MAX_PINS } from "@workadventure/shared-utils";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { SpaceInterface } from "../../../Space/SpaceInterface";
    import { pinnedFirst, RECORDER_LAYOUT_MODES, RECORDER_MAX_TILES } from "../../../Utils/RecorderLayout";
    import RecorderLayoutPreview from "./RecorderLayoutPreview.svelte";

    // The producer panel: the person recording over the map directs it live. The ?recorder page applies each change
    // within a second (see RecorderDirector).
    interface Props {
        space: SpaceInterface;
    }

    let { space }: Props = $props();

    const recording = $derived(space.state.observe("recording"));
    // A change shows at once, until the space state comes back with it (or without it, if it was refused).
    const confirmed = $derived($recording.production);
    let pending = $state.raw<{ base: RecordingProduction | undefined; next: RecordingProduction } | undefined>(
        undefined,
    );
    const production = $derived(pending && pending.base === confirmed ? pending.next : confirmed);
    const users = $derived(space.usersStore);
    const ZOOMS: RecordingZoom[] = ["tight", "wide", "whole"];

    function change(update: Partial<RecordingProduction>): void {
        if (!production) return;
        const next = { ...production, ...update };
        pending = { base: confirmed, next };
        space.state.setRecordingProduction(next).catch((error) => {
            pending = undefined;
            console.error("Could not change the recording", error);
        });
    }

    // Half of the tiles at most: the others still follow who speaks.
    const maxPins = $derived(
        production ? Math.min(RECORDING_MAX_PINS, Math.floor(RECORDER_MAX_TILES[production.layout] / 2)) : 0,
    );

    // Who the video shows: the pinned people first, then the others (the recording puts the last speakers first).
    const filmed = $derived(
        production
            ? pinnedFirst([...$users.values()], production.pins, (user) => user.spaceUserId).map((user) => user.name)
            : [],
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

    const label = "text-xs font-semibold uppercase tracking-wide text-white/70";
    const segment =
        "flex-1 min-h-9 rounded px-2 py-1 text-xs font-semibold transition-colors text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary aria-pressed:bg-secondary aria-pressed:text-white";
</script>

{#if production}
    <div class="flex flex-col gap-3 pt-2" data-testid="recording-producer-panel">
        <div class="flex flex-col gap-1">
            <span class={label}>{$LL.recording.actionbar.producer.preview()}</span>
            <div
                class="rounded-md ring-2 ring-red-400/80"
                data-testid="recording-producer-preview"
                role="img"
                aria-label="{$LL.recording.actionbar.spacePicker.layout[production.layout]()}: {filmed.join(', ')}"
            >
                <RecorderLayoutPreview mode={production.layout} cameraCount={filmed.length} names={filmed} />
            </div>
        </div>

        <div class="flex flex-col gap-1">
            <span class={label}>{$LL.recording.actionbar.producer.layout()}</span>
            <div class="grid grid-cols-3 gap-1.5" role="group" aria-label={$LL.recording.actionbar.producer.layout()}>
                {#each RECORDER_LAYOUT_MODES as layout (layout)}
                    <button
                        type="button"
                        class="flex flex-col gap-1 rounded-md border border-white/15 p-1 text-[11px] font-semibold leading-tight text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary aria-pressed:border-secondary aria-pressed:bg-secondary/25"
                        aria-pressed={production.layout === layout}
                        data-testid="recording-producer-layout-{layout}"
                        onclick={() => change({ layout })}
                    >
                        <RecorderLayoutPreview mode={layout} cameraCount={4} />
                        {$LL.recording.actionbar.spacePicker.layout[layout]()}
                    </button>
                {/each}
            </div>
        </div>

        <div class="flex flex-col gap-1">
            <span class={label}>{$LL.recording.actionbar.producer.zoom()}</span>
            <div
                class="flex gap-1 rounded-md bg-black/25 p-1"
                role="group"
                aria-label={$LL.recording.actionbar.producer.zoom()}
            >
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
        </div>

        <div class="flex flex-col gap-1">
            <span class={label}>{$LL.recording.actionbar.producer.framing()}</span>
            <div
                class="flex gap-1 rounded-md bg-black/25 p-1"
                role="group"
                aria-label={$LL.recording.actionbar.producer.framing()}
            >
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
        </div>

        <div class="flex flex-col gap-1">
            <span class={label}>{$LL.recording.actionbar.producer.cameras()}</span>
            <div class="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {#each [...$users.values()] as user (user.spaceUserId)}
                    {@const pinned = production.pins.includes(user.spaceUserId)}
                    <div class="flex items-center gap-2 py-0.5 text-sm text-white">
                        <span class="min-w-0 flex-1 truncate">{user.name}</span>
                        <button
                            type="button"
                            class="min-h-8 min-w-16 rounded border px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary {pinned
                                ? 'border-white bg-white text-contrast'
                                : 'border-white/25 text-white hover:bg-white/10'}"
                            aria-pressed={pinned}
                            aria-label="{$LL.recording.actionbar.producer.pin()} {user.name}"
                            data-testid="recording-producer-pin"
                            onclick={() => togglePin(user.spaceUserId)}
                        >
                            {pinned ? $LL.recording.actionbar.producer.unpin() : $LL.recording.actionbar.producer.pin()}
                        </button>
                    </div>
                {/each}
            </div>
            <span class="text-xs text-white/70">{$LL.recording.actionbar.producer.pinHint({ max: maxPins })}</span>
        </div>
    </div>
{/if}
