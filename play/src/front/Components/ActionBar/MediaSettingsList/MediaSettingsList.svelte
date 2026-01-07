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
    class="absolute pb-2 top-20 bottom-auto mobile:top-auto mobile:bottom-20 start-1/2 transform -translate-x-1/2 text-white rounded-md w-64 overflow-hidden before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:start-0 before:top-0 before:rounded-lg before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:-start-0 transition-all"
    in:fly={{ y: 40, duration: 150 }}
    use:clickOutside={() => dispatch("close")}
>
    <div class="flex flex-col gap-2 p-1" style="max-height: calc(100vh - 160px);">
        <div class="sticky top-0 z-20 x -mx-1 px-1 pt-1 -mt-1">
            <MediaSettingsListHeader bind:mode />
        </div>

        <div class="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
            {#if mode === "settings"}
                <MediaSettingsPanel on:cameraSelected={handleCameraSelected} />
            {:else if mode === "background"}
                <BackgroundSettingsPanel />
            {/if}
        </div>
    </div>
</div>
