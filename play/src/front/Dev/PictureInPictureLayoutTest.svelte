<script lang="ts">
    import {
        computePictureInPictureGridLayout,
        pipGridTemplateColumns,
        pipGridTemplateRows,
        pipTileStyle,
        PIP_GRID_MAX_VIDEOS,
        type PipGridLayout,
    } from "../Components/Video/PictureInPicture/pictureInPictureGridLayout";

    /** Nombre de blocs « vidéo » affichés (1…8). */
    let videoCount = 4;
    /** Premier tuile : vidéo démo (flux public MDN) au lieu du numéro. */
    let demoVideoOnFirstSlot = false;

    const demoVideoSrc = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm";
    let w = 400;
    let h = 520;
    let layout: PipGridLayout;

    /** Met à jour w/h quand le cadre « PiP » est redimensionné (poignée resize du navigateur). */
    function pipFrameResizeAction(node: HTMLElement) {
        const apply = () => {
            w = node.clientWidth;
            h = node.clientHeight;
        };
        apply();
        const ro = new ResizeObserver(apply);
        ro.observe(node);
        return { destroy: () => ro.disconnect() };
    }

    $: layout = computePictureInPictureGridLayout(videoCount, w, h);
    $: portraitLabel = layout.portrait ? "portrait (h > w)" : "paysage (w ≥ h)";

    function add() {
        videoCount = Math.min(PIP_GRID_MAX_VIDEOS, videoCount + 1);
    }

    function remove() {
        videoCount = Math.max(0, videoCount - 1);
    }
</script>

<div class="pip-test-page min-h-screen bg-slate-900 p-6 text-slate-100">
    <h1 class="mb-2 text-xl font-semibold">Test layout PiP</h1>
    <p class="mb-6 max-w-3xl text-sm text-slate-400">
        Aperçu de <code class="rounded bg-slate-800 px-1">pictureInPictureGridLayout.ts</code> : max
        {PIP_GRID_MAX_VIDEOS} tuiles, grille adaptée au ratio du cadre ci-dessous (redimensionnable).
    </p>

    <div class="mb-6 flex flex-wrap items-end gap-4">
        <label class="flex flex-col gap-1 text-sm">
            <span>Nombre de vidéos (0–{PIP_GRID_MAX_VIDEOS})</span>
            <input
                type="number"
                min="0"
                max={PIP_GRID_MAX_VIDEOS}
                bind:value={videoCount}
                class="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1"
            />
        </label>
        <div class="flex gap-2">
            <button
                type="button"
                class="rounded bg-emerald-700 px-3 py-1 text-sm hover:bg-emerald-600"
                on:click={add}
                disabled={videoCount >= PIP_GRID_MAX_VIDEOS}
            >
                +1
            </button>
            <button
                type="button"
                class="rounded bg-rose-800 px-3 py-1 text-sm hover:bg-rose-700"
                on:click={remove}
                disabled={videoCount <= 0}
            >
                −1
            </button>
        </div>
        <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" bind:checked={demoVideoOnFirstSlot} class="accent-emerald-600" />
            <span>Premier emplacement = vidéo démo (webm MDN)</span>
        </label>
    </div>

    <div class="mb-4 flex flex-wrap gap-3 text-sm">
        <span class="rounded bg-slate-800 px-2 py-1">Cadre : {Math.round(w)} × {Math.round(h)} px</span>
        <span class="rounded bg-slate-800 px-2 py-1">{portraitLabel}</span>
        <span class="rounded bg-slate-800 px-2 py-1">{layout.description}</span>
    </div>

    <!-- Cadre type fenêtre PiP : redimensionner le coin -->
    <div
        use:pipFrameResizeAction
        class="pip-test-frame mb-8 overflow-hidden rounded-lg border-2 border-dashed border-amber-500/60 bg-black/40"
        style="width: 400px; height: 520px; min-width: 200px; min-height: 240px; max-width: 95vw; max-height: 80vh; resize: both;"
    >
        {#if layout.tiles.length === 0}
            <div class="flex h-full items-center justify-center text-slate-500">0 vidéo</div>
        {:else}
            <div
                class="pip-test-grid h-full w-full gap-2 p-2"
                style="display: grid; grid-template-columns: {pipGridTemplateColumns(
                    layout.columnTracks
                )}; grid-template-rows: {pipGridTemplateRows(layout.rowTracks)};"
            >
                {#each layout.tiles as tile, i (i)}
                    <div
                        class="relative flex min-h-0 min-w-0 overflow-hidden rounded-md border border-white/20 bg-gradient-to-br from-cyan-900/80 to-slate-800 text-lg font-medium text-white/90"
                        style={pipTileStyle(tile)}
                    >
                        {#if demoVideoOnFirstSlot && i === 0}
                            <video
                                class="h-full w-full object-cover"
                                src={demoVideoSrc}
                                muted
                                loop
                                autoplay
                                playsinline
                                controls
                            />
                        {:else}
                            <div class="flex h-full w-full items-center justify-center">
                                <span class="select-none">{i + 1}</span>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <details class="max-w-3xl rounded border border-slate-700 bg-slate-950/50 p-3 text-sm">
        <summary class="cursor-pointer font-medium text-slate-300">JSON layout</summary>
        <pre class="mt-2 overflow-x-auto text-xs text-emerald-200/90">{JSON.stringify(layout, null, 2)}</pre>
    </details>
</div>

<style>
    .pip-test-page :global(code) {
        font-size: 0.85em;
    }
</style>
