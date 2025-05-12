<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import { screenWakeLock } from "../../Utils/ScreenWakeLock";
    import { inExternalServiceStore } from "../../Stores/MyMediaStore";

    export let actualCowebsite: BBBCoWebsite;
    export let visible: boolean;
    let screenWakeRelease: (() => Promise<void>) | undefined;

    onMount(async () => {
        try {
            await screenWakeLock
                .requestWakeLock()
                .then((release) => (screenWakeRelease = release))
                .catch((error) => console.error(error));
            inExternalServiceStore.set(true);
        } catch (e) {
            console.error("Error with Screen Wake Lock :", e);
        }
    });

    onDestroy(async () => {
        try {
            if (screenWakeRelease) {
                await screenWakeRelease();
                // eslint-disable-next-line require-atomic-updates
                screenWakeRelease = undefined;
            }
            inExternalServiceStore.set(false);
        } catch (e) {
            console.error("Screen Wake off not successfully!", e);
        }
    });
</script>

<div class="relative w-full h-full" class:hidden={!visible}>
    <div class="absolute w-full h-full z-0">
        <iframe
            src={actualCowebsite.getUrl().toString()}
            frameborder="0"
            allow={actualCowebsite.getAllowPolicy()}
            title="Big Blue Button Meeting"
            class="bg-white w-full h-full"
            id="iframe"
        />
    </div>
</div>
