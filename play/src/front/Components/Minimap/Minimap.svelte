<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { gameSceneIsLoadedStore, gameSceneStore } from "../../Stores/GameSceneStore";
    import { cameraDetachedStore } from "../../Stores/CameraStore";
    import { mapEditorModeStore } from "../../Stores/MapEditorStore";
    import { MinimapManager } from "../../Phaser/Game/MinimapManager";
    import { groupMinimapAreas } from "../../Phaser/Game/MinimapGeometry";
    import type { MinimapState } from "../../Phaser/Game/MinimapManager";
    import { IconArrowsMaximize, IconArrowsMinimize, IconFocusCentered, IconMap, IconMinus } from "@wa-icons";

    let selectedAreaIds = $state<string[]>([]);
    let visible = $state(true);
    let controller = $state.raw<MinimapManager>();
    let compactZoom = $state(0);
    let overviewZoom = $state(0);
    let expanded = $state(false);
    let surface = $state<HTMLButtonElement>();
    let view = $state<MinimapState>();
    let surfaceWidth = $state(240);
    let surfaceHeight = $state(190);
    const areas = $derived(groupMinimapAreas(view?.areas ?? [], surfaceWidth, surfaceHeight));

    const selectedAreas = $derived(
        (areas.find((group) => group.members.some((area) => selectedAreaIds.includes(area.id)))?.members ?? [])
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name)),
    );

    $effect(() => {
        if (!surface || !visible || !$gameSceneStore || !$gameSceneIsLoadedStore || $mapEditorModeStore) {
            return;
        }
        const minimap = new MinimapManager($gameSceneStore, surface, expanded, (state) => {
            view = state;
        });
        controller = minimap;
        return () => {
            controller = undefined;
            minimap.destroy();
        };
    });

    $effect(() => {
        controller?.setZoomLevel(expanded ? overviewZoom : compactZoom);
    });

    function zoom(delta: number) {
        if (expanded) overviewZoom = Math.max(-8, Math.min(4, overviewZoom + delta));
        else compactZoom = Math.max(-8, Math.min(4, compactZoom + delta));
    }

    function selectArea(id: string) {
        selectedAreaIds = [];
        controller?.moveToArea(id).catch((reason) => console.warn(reason));
    }

    function toggleExpanded() {
        selectedAreaIds = [];
        expanded = !expanded;
    }

    function recenter() {
        controller?.recenter();
        $gameSceneStore?.getCameraManager().resumePlayerFollow();
    }
</script>

<svelte:window
    onkeydown={(event) => {
        if (event.key === "Escape") selectedAreaIds = [];
    }}
/>

{#if $gameSceneIsLoadedStore && !$mapEditorModeStore}
    <aside
        class="absolute left-4 bottom-4 mobile:bottom-24 pointer-events-auto z-10"
        aria-label={$LL.mapEditor.sideBar.mapExplorerActivated()}
        data-testid="minimap"
    >
        {#if visible}
            <div
                class="relative border border-contrast-400 rounded-[18px] shadow-[0_8px_30px_#0008] ring-4 ring-black/20 w-[280px] h-[210px] max-sm:w-[210px] max-sm:h-[160px]"
                style:width={expanded ? "min(760px, calc(100vw - 80px))" : undefined}
                style:height={expanded ? "min(480px, 60dvh)" : undefined}
            >
                <button
                    bind:this={surface}
                    bind:clientWidth={surfaceWidth}
                    bind:clientHeight={surfaceHeight}
                    type="button"
                    class="absolute inset-0 w-full h-full rounded-[17px] bg-transparent cursor-grab active:cursor-grabbing touch-none overflow-hidden focus-visible:outline-2 focus-visible:outline-primary"
                    aria-label={$LL.mapEditor.sideBar.mapExplorerActivated()}
                    aria-expanded={expanded}
                    onclick={toggleExpanded}
                    data-testid="minimap-surface"
                >
                    {#if view}
                        {#if $cameraDetachedStore}
                            <span
                                class="absolute border border-white/80 pointer-events-none"
                                style:left={`${view.viewport.x}%`}
                                style:top={`${view.viewport.y}%`}
                                style:width={`${view.viewport.width}%`}
                                style:height={`${view.viewport.height}%`}
                            ></span>
                        {/if}
                    {/if}
                </button>
                {#if view}
                    <div class="absolute inset-0 pointer-events-none rounded-[17px] overflow-hidden">
                        {#each areas as area (area.id)}
                            <button
                                type="button"
                                oncontextmenu={(event) => controller?.handleContextMenu(event)}
                                onclick={() => {
                                    if (area.count === 1) selectArea(area.id);
                                    else selectedAreaIds = area.members.map((member) => member.id);
                                }}
                                aria-expanded={area.count > 1
                                    ? selectedAreas.some((item) => item.id === area.id)
                                    : undefined}
                                aria-controls={area.count > 1 ? "minimap-destinations" : undefined}
                                class="{area.count > 1
                                    ? 'bg-primary border-primary-400'
                                    : 'bg-contrast/95 border-contrast-400'} group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 z-10 hover:z-20 flex h-[22px] min-w-[22px] px-1 items-center justify-center rounded-full border text-white text-xs font-bold shadow hover:bg-primary focus-visible:outline-2 focus-visible:outline-primary"
                                style:left={`${area.x}%`}
                                style:top={`${area.y}%`}
                                style:opacity={Math.hypot(
                                    ((area.x - view.player.x) * surfaceWidth) / 100,
                                    ((area.y - view.player.y) * surfaceHeight) / 100,
                                ) < 22
                                    ? 0.45
                                    : 1}
                                title={area.name}
                                aria-label={area.name}
                                data-testid="minimap-area"
                            >
                                {area.count > 1 ? area.count : "i"}
                                <span
                                    class="pointer-events-none absolute my-1 hidden group-hover:block max-w-52 w-max whitespace-normal text-center rounded bg-contrast px-2 py-1 text-xs font-normal text-white shadow"
                                    style:bottom={area.y < 25 ? undefined : "100%"}
                                    style:top={area.y < 25 ? "100%" : undefined}
                                    style:left={area.x < 35 ? "0" : undefined}
                                    style:right={area.x > 65 ? "0" : undefined}
                                    aria-hidden="true">{area.name}</span
                                >
                            </button>
                        {/each}
                    </div>
                {/if}
                {#if selectedAreas.length > 0}
                    <div
                        id="minimap-destinations"
                        role="region"
                        aria-label={$LL.mapEditor.sideBar.mapExplorerActivated()}
                        class="absolute z-40 bottom-2 inset-x-2 max-h-[calc(100%-16px)] flex flex-col overflow-hidden rounded-xl border border-contrast-400 bg-contrast text-white shadow-xl"
                        style:left={expanded ? "auto" : undefined}
                        style:width={expanded ? "min(300px, calc(100% - 16px))" : undefined}
                        data-testid="minimap-destinations"
                    >
                        <div
                            class="flex items-center justify-between gap-2 shrink-0 border-b border-contrast-400 px-3 py-2 text-sm"
                        >
                            <span>{$LL.mapEditor.sideBar.mapExplorerActivated()}</span>
                            <button
                                type="button"
                                class="rounded px-2 py-1 hover:bg-primary"
                                aria-label={$LL.cowebsite.close()}
                                onclick={() => (selectedAreaIds = [])}>×</button
                            >
                        </div>
                        <div class="min-h-0 overflow-y-auto p-1">
                            {#each selectedAreas as destination (destination.id)}
                                <button
                                    type="button"
                                    class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-primary focus-visible:bg-primary focus-visible:outline-2 focus-visible:outline-primary"
                                    title={$LL.mapEditor.explorer.details.moveToArea({ name: destination.name })}
                                    onclick={() => selectArea(destination.id)}
                                    data-testid="minimap-destination"
                                    ><span class="min-w-0 break-words">{destination.name}</span><span
                                        class="shrink-0 text-primary-300"
                                        aria-hidden="true">→</span
                                    ></button
                                >
                            {/each}
                        </div>
                    </div>
                {/if}
                <div class="absolute z-30 left-1.5 bottom-1.5 flex gap-1" data-testid="minimap-zoom">
                    <button
                        type="button"
                        class="rounded-lg bg-contrast/90 text-white w-8 h-8 text-lg hover:bg-contrast disabled:opacity-40 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-primary"
                        aria-label={$LL.mapEditor.explorer.zoomIn()}
                        title={$LL.mapEditor.explorer.zoomIn()}
                        disabled={!view?.canZoomIn}
                        onclick={() => zoom(1)}
                        data-testid="minimap-zoom-in">+</button
                    >
                    <button
                        type="button"
                        class="rounded-lg bg-contrast/90 text-white w-8 h-8 text-lg hover:bg-contrast disabled:opacity-40 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-primary"
                        aria-label={$LL.mapEditor.explorer.zoomOut()}
                        title={$LL.mapEditor.explorer.zoomOut()}
                        disabled={!view?.canZoomOut}
                        onclick={() => zoom(-1)}
                        data-testid="minimap-zoom-out">−</button
                    >
                    <button
                        type="button"
                        class="flex items-center justify-center rounded-lg bg-contrast/90 text-white w-8 h-8 hover:bg-contrast focus-visible:outline-2 focus-visible:outline-primary"
                        aria-label={$LL.mapEditor.explorer.showMyLocation()}
                        title={$LL.mapEditor.explorer.showMyLocation()}
                        onclick={recenter}
                        data-testid="minimap-recenter"><IconFocusCentered width="20" height="20" /></button
                    >
                </div>
                <div class="absolute z-30 right-1.5 top-1.5 flex gap-1">
                    <button
                        type="button"
                        class="rounded-lg bg-contrast/90 text-white p-2 hover:bg-contrast focus-visible:outline-2 focus-visible:outline-primary"
                        aria-label={expanded ? $LL.cowebsite.close() : $LL.mapEditor.sideBar.mapExplorerActivated()}
                        aria-expanded={expanded}
                        onclick={toggleExpanded}
                        data-testid="minimap-expand"
                    >
                        {#if expanded}
                            <IconArrowsMinimize width="18" height="18" />
                        {:else}
                            <IconArrowsMaximize width="18" height="18" />
                        {/if}
                    </button>
                    <button
                        type="button"
                        class="rounded-lg bg-contrast/90 text-white p-2 hover:bg-contrast focus-visible:outline-2 focus-visible:outline-primary"
                        aria-label={$LL.cowebsite.close()}
                        onclick={() => {
                            selectedAreaIds = [];
                            visible = false;
                            expanded = false;
                        }}
                        data-testid="minimap-hide"><IconMinus width="18" height="18" /></button
                    >
                </div>
            </div>
        {:else}
            <button
                type="button"
                class="rounded-xl bg-contrast/90 text-white p-3 hover:bg-contrast focus-visible:outline-2 focus-visible:outline-primary"
                aria-label={$LL.mapEditor.sideBar.mapExplorerActivated()}
                onclick={() => (visible = true)}
                data-testid="minimap-show"><IconMap width="22" height="22" /></button
            >
        {/if}
    </aside>
{/if}
