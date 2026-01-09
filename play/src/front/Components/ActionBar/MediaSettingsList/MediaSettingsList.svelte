<script lang="ts">
    import { fly } from "svelte/transition";
    import { clickOutside } from "svelte-outside";
    import { createEventDispatcher, onDestroy } from "svelte";
    import { inBackgroundSettingsStore } from "../../../Stores/MediaStore";
    import MediaSettingsListHeader from "./MediaSettingsListHeader.svelte";
    import MediaSettingsPanel from "./MediaSettingsPanel.svelte";
    import BackgroundSettingsPanel from "./BackgroundSettingsPanel.svelte";

    export let mediaSettingsDisplayed = false;

    let mode: "settings" | "background" = "settings";

    $: inBackgroundSettingsStore.set(mode === "background");

    onDestroy(() => {
        inBackgroundSettingsStore.set(false);
    });

    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    function handleCameraSelected() {
        mediaSettingsDisplayed = false;
    }
</script>

<div
    class="absolute pb-2 top-20 bottom-auto mobile:top-auto mobile:bottom-20 start-1/2 transform -translate-x-1/2 text-white rounded-md w-64 before:content-[''] before:absolute before:w-full before:h-full before:-z-10 before:start-0 before:top-0 before:rounded-lg before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:-z-20 after:w-full after:bg-transparent after:h-full after:-top-4 after:-start-0 transition-all"
    in:fly={{ y: 40, duration: 150 }}
    use:clickOutside={() => dispatch("close")}
>
    <div
        class="scrollable-content flex flex-col gap-2 p-1 overflow-y-auto relative"
        style="max-height: calc(100vh - 160px);"
    >
        <div class="sticky top-0 z-20 x -mx-1 px-1 pt-1 -mt-1">
            <MediaSettingsListHeader bind:mode />
        </div>

        <div class="flex flex-col gap-2 flex-1 min-h-0">
            {#if mode === "settings"}
                <MediaSettingsPanel on:cameraSelected={handleCameraSelected} />
            {:else if mode === "background"}
                <BackgroundSettingsPanel />
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    .scrollable-content {
        // Force scrollbar to always be visible (not overlay) on macOS/WebKit
        &::-webkit-scrollbar {
            -webkit-appearance: none;
            width: 4px;
        }
        &::-webkit-scrollbar-track {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
        &::-webkit-scrollbar-thumb {
            background-color: #928ebb;
            border-radius: 10px;
            min-height: 20px;
        }
        &::-webkit-scrollbar-thumb:active {
            background-color: #56eaff;
        }

        // Firefox
        scrollbar-width: thin;
        scrollbar-color: #928ebb rgba(255, 255, 255, 0.1);
    }
</style>
