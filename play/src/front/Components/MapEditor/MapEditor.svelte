<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore, mapEditorVisibilityStore } from "../../Stores/MapEditorStore";
    import Explorer from "../Exploration/Explorer.svelte";

    import { windowSize } from "../../Stores/CoWebsiteStore";

    import AreaEditor from "./AreaEditor/AreaEditor.svelte";
    import EntityEditor from "./EntityEditor/EntityEditor.svelte";
    import MapEditorSideBar from "./MapEditorSideBar.svelte";
    import TrashEditor from "./TrashEditor.svelte";
    import ConfigureMyRoom from "./WAMSettingsEditor.svelte";
    import MapEditorResizeHandle from "./MapEditorResizeHandle.svelte";
    import { mapEditorSideBarWidthStore } from "./MapEditorSideBarWidthStore";

    let mapEditor: HTMLElement;

    $: mapEditorSideBarWidth =
        $mapEditorVisibilityStore && $mapEditorSelectedToolStore !== EditorToolName.WAMSettingsEditor
            ? $mapEditorSideBarWidthStore
            : 0;

    function onResize(width: number) {
        mapEditorSideBarWidthStore.set(width);
    }

    $: if (mapEditor) {
        mapEditor.style.width = `${mapEditorSideBarWidth}px`;
    }

    onMount(() => {
        const width = Math.min($windowSize.width / 2, Math.max(200, $mapEditorSideBarWidthStore));
        mapEditor.style.width = `${width}px`;
    });
</script>

{#if $mapEditorSelectedToolStore === EditorToolName.WAMSettingsEditor}
    <ConfigureMyRoom />
{/if}
<div
    id="map-editor-container"
    class="z-[500] flex flex-row items-start justify-end gap-4 absolute h-full max-w-full md:max-w-[calc(100%-18px)] top-0 end-0 pointer-events-none"
>
    <div
        in:fly={{ x: 100, duration: 250, delay: 300 }}
        out:fly={{ x: 100, duration: 200, delay: 100 }}
        class="hidden md:block"
        class:!block={$mapEditorVisibilityStore == false}
    >
        <MapEditorSideBar />
    </div>
    <div
        id="map-editor-right"
        bind:this={mapEditor}
        class={`map-editor screen-blocker relative h-dvh max-w-full md:max-w-[calc(100%-64px)] pointer-events-auto ${$mapEditorSelectedToolStore}`}
    >
        {#if $mapEditorVisibilityStore && $mapEditorSelectedToolStore !== EditorToolName.WAMSettingsEditor}
            <div class="absolute h-dvh -start-0.5 top-0 flex flex-col z-[2000]">
                <MapEditorResizeHandle
                    minWidth={200}
                    maxWidth={$windowSize.width / 1.5}
                    currentWidth={$mapEditorSideBarWidthStore}
                    onResize={(width) => onResize(width)}
                />
            </div>
            <div
                class="sidebar h-dvh bg-contrast/80 backdrop-blur-md p-2 md:p-4"
                in:fly={{ x: 100, duration: 200, delay: 200 }}
                out:fly={{ x: 100, duration: 200 }}
            >
                {#if $mapEditorSelectedToolStore === EditorToolName.TrashEditor}
                    <TrashEditor />
                {/if}
                {#if $mapEditorSelectedToolStore === EditorToolName.EntityEditor}
                    <EntityEditor />
                {/if}
                {#if $mapEditorSelectedToolStore === EditorToolName.AreaEditor}
                    <AreaEditor />
                {/if}
                {#if $mapEditorSelectedToolStore === EditorToolName.ExploreTheRoom}
                    <Explorer />
                {/if}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .map-editor {
        top: 0;
        inset-inline-end: 0;
        width: fit-content;
        z-index: 1999;
        pointer-events: auto;
        color: whitesmoke;

        button.close-window {
            inset-inline-end: 0.5rem;
        }

        &.WAMSettingsEditor {
            width: 80% !important;
            inset-inline-start: 10%;
            height: 0 !important;
        }

        .sidebar {
            position: relative !important;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
    }
</style>
