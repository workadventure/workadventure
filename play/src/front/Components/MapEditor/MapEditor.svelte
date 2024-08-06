<script lang="ts">
    import { fly } from "svelte/transition";
    import { ArrowRightIcon } from "svelte-feather-icons";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore, mapEditorVisibilityStore } from "../../Stores/MapEditorStore";
    import Explorer from "../Exploration/Explorer.svelte";
    import MapEditorSideBar from "./MapEditorSideBar.svelte";
    import EntityEditor from "./EntityEditor.svelte";
    import AreaEditor from "./AreaEditor.svelte";
    import ConfigureMyRoom from "./WAMSettingsEditor.svelte";
    import TrashEditor from "./TrashEditor.svelte";

    let resizeBar: HTMLDivElement;
    let container: HTMLDivElement;

    function hideMapEditor() {
        mapEditorVisibilityStore.set(false);
    }
    const handleMousedown = (e: MouseEvent) => {
        let dragX = e.clientX;
        document.onmousemove = (e) => {
            const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const newWidth = Math.min(container.offsetWidth - e.clientX + dragX, vw)
            container.style.maxWidth = newWidth + "px";
            container.style.width = newWidth + "px";
            dragX = e.clientX;
        };
        document.onmouseup = () => {
            document.onmousemove = null;
        };
    };

    // const handbleMousedown = (e) => {
    //     let dragX = e.clientX;
    //     document.onmousemove = function onMouseMove(e) {
    //         console.log("width container", container.offsetWidth);
    //         console.log("event", e.clientX);
    //         console.log("drag", dragX);
    //         console.log("result", container.offsetWidth - e.clientX + "px");
    //         // const deltaX = e.clientX - dragX;
    //         // const newWidth = initialWidth + deltaX;
    //         container.style.width = container.offsetWidth + e.clientX - dragX + "px";

    //         dragX = e.clientX;
    //     };
    //     document.onmouseup = () => {
    //         document.onmousemove = document.onmouseup = null;
    //     };
    // };

    const handleDbClick = () => {
        if (container.style.width === document.documentElement.clientWidth + "px") {
            container.style.width = 335 + "px";
        } else {
            container.style.width = document.documentElement.clientWidth + "px";
        }
    };
</script>

<MapEditorSideBar />
<div
    class={`map-editor h-full backdrop-blur text-center bg-contrast/80 absolute top-0 right-0 w-[23rem] z-[425] pointer-events-auto text-white sidebar ${$mapEditorSelectedToolStore}`}
    bind:this={container}
>
    {#if $mapEditorSelectedToolStore === EditorToolName.WAMSettingsEditor}
        <ConfigureMyRoom />
    {:else if $mapEditorVisibilityStore}
        <button class="absolute right-10 p-1 mt-4 cursor-pointer" on:click={hideMapEditor}
            ><ArrowRightIcon size="20" /></button
        >
        <div
            class="relative flex flex-col gap-4 sidebar h-full mt-12 px-2 w-fit"
            in:fly={{ x: 100, duration: 250, delay: 200 }}
            out:fly={{ x: 100, duration: 200 }}
        >
            <!--<button class="close-window" on:click={closeMapEditor}>&#215;</button>-->
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
    <div
        class="absolute left-1 top-0 bottom-0 m-auto w-1.5 h-40 bg-white rounded cursor-col-resize"
        bind:this={resizeBar}
        on:mousedown={handleMousedown}
        on:dblclick={handleDbClick}
    />
</div>

<!-- class:resize-bar={resizeBarHide}
bind:this={resizeBar}
on:mousedown={resizeCowebsite}
on:mousedown={addDivForResize}
on:mouseup={removeDivForResize}
on:touchstart={addDivForResize}
on:touchstart={() => isResized.set(true)}
on:dragend={removeDivForResize}
on:touchend={removeDivForResize} -->
<style lang="scss">
    // &.WAMSettingsEditor {
    //     width: 80% !important;
    //     left: 10%;
    //     height: 0 !important;
    // }
</style>
