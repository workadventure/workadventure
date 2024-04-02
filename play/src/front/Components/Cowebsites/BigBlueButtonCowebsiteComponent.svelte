<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import { screenWakeLock } from "../../Utils/ScreenWakeLock";
    import { inExternalServiceStore } from "../../Stores/MyMediaStore";

    export let actualCowebsite: BBBCoWebsite;

    onMount(() => {
        try {
            screenWakeLock
                .requestWakeLock()
                .then((release) => (actualCowebsite.screenWakeRelease = release))
                .catch((error) => console.error(error));
            inExternalServiceStore.set(true);
            console.log("BBB Screen Wake Lock requested successfully!");
        } catch (e) {
            console.error("Error with Screen Wake Lock :", e);
        }
    });

    onDestroy(async () => {
        try {
            if (actualCowebsite.screenWakeRelease) {
                await actualCowebsite.screenWakeRelease();
                actualCowebsite.screenWakeRelease = undefined;
            }
            inExternalServiceStore.set(false);
            console.log("BBB Screen Wake off successfully!");
        } catch (e) {
            console.error("BBB Screen Wake off not successfully!", e);
        }
    });
</script>

<iframe
    src={actualCowebsite.getUrl().toString()}
    frameborder="0"
    allow="fullscreen"
    title="Cowebsite"
    class="pixel bg-white h-full w-full z-index-0"
/>
