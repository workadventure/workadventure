<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import {
        mapEditorModeStore,
        mapEditorSelectedToolStore,
        mapEditorVisibilityStore,
    } from "../../Stores/MapEditorStore";
    import Explorer from "../Exploration/Explorer.svelte";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import { windowSize } from "../../Stores/CoWebsiteStore";
    import AreaEditor from "./AreaEditor/AreaEditor.svelte";
    import EntityEditor from "./EntityEditor/EntityEditor.svelte";
    import MapEditorSideBar from "./MapEditorSideBar.svelte";
    import TrashEditor from "./TrashEditor.svelte";
    import ConfigureMyRoom from "./WAMSettingsEditor.svelte";

    import MapEditorResizeHandle from "./MapEditorResizeHandle.svelte";
    import { mapEditorSideBarWidthStore } from "./MapEditorSideBarWidthStore";
    import { IconMinus } from "@wa-icons";

    let mapEditor: HTMLElement;

    function closeMapEditor() {
        analyticsClient.toggleMapEditor(false);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);
        mapEditorModeStore.switchMode(false);
    }
    function hideMapEditor() {
        mapEditorVisibilityStore.set(false);
    }

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
    class="z-[500] flex flex-row items-start justify-end gap-4 absolute h-full top-0 right-0"
>
    <div in:fly={{ x: 100, duration: 250, delay: 300 }} out:fly={{ x: 100, duration: 200, delay: 100 }}>
        <MapEditorSideBar />
    </div>
    <div id="map-editor-right" bind:this={mapEditor} class={`map-editor relative h-dvh ${$mapEditorSelectedToolStore}`}>
        {#if $mapEditorVisibilityStore && $mapEditorSelectedToolStore !== EditorToolName.WAMSettingsEditor}
            <div class="absolute h-dvh -left-0.5 top-0 flex flex-col z-[2000]">
                <MapEditorResizeHandle
                    minWidth={200}
                    maxWidth={$windowSize.width / 2}
                    currentWidth={$mapEditorSideBarWidthStore}
                    onResize={(width) => onResize(width)}
                />
            </div>
            <div
                class="sidebar h-dvh bg-contrast/80 backdrop-blur-md"
                in:fly={{ x: 100, duration: 200, delay: 200 }}
                out:fly={{ x: 100, duration: 200 }}
            >
                <button
                    class=" h-12 w-12 rounded absolute  hover:bg-secondary   aspect-square right-10 cursor-pointer text-2xl"
                    on:click={hideMapEditor}><IconMinus font-size="16" /></button
                >
                <ButtonClose dataTestId="mapEditor-close-button" on:click={closeMapEditor} />

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
        right: 0;
        z-index: 1999;
        pointer-events: auto;
        color: whitesmoke;

        button.close-window {
            right: 0.5rem;
        }

        &.WAMSettingsEditor {
            width: 80% !important;
            left: 10%;
            height: 0 !important;
        }

        .sidebar {
            position: relative !important;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 1.5em;
        }
    }
</style>
