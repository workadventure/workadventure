<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import { screenWakeLock } from "../../Utils/ScreenWakeLock";
    import { inExternalServiceStore } from "../../Stores/MyMediaStore";

    export let actualCowebsite: BBBCoWebsite;
    let iframeBBBCowebsite: HTMLIFrameElement;

    onMount(async () => {
        console.log("BBB Meeting loading...");
        try {
            screenWakeLock
                .requestWakeLock()
                .then((release) => (actualCowebsite.screenWakeRelease = release))
                .catch((error) => console.error(error));
            inExternalServiceStore.set(true);
            await actualCowebsite.load();
            console.log("BBB Meeting loaded successfully!");
        } catch (e) {
            console.error("Error loading BBB Meeting:", e);
        }
    });

    onDestroy(async () => {
        try {
            if (actualCowebsite.screenWakeRelease) {
                await actualCowebsite.screenWakeRelease();
                actualCowebsite.screenWakeRelease = undefined;
            }
            inExternalServiceStore.set(false);
            await actualCowebsite.unload();
            console.log("BBB Meeting unloaded successfully!");
        } catch (e) {
            console.error("Error unloading BBB Meeting:", e);
        }
    });
</script>

<iframe bind:this={iframeBBBCowebsite} class="w-full height" title="Cowebsite" frameborder="none" />

<!-- <div bind:this={BBBContainer} class="w-full height" /> -->
<!-- <script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";

    export let actualCowebsite: BBBCoWebsite;

    onMount(() => {
        actualCowebsite.load()
            .then(() => {
                console.log("BBB Meeting loaded successfully!");
            })
            .catch((e) => {
                console.error("Error loading BBB Meeting:", e);
            });
    });

    onDestroy(() => {
        actualCowebsite.unload()
            .then(() => {
                console.log("BBB Meeting unloaded successfully!");
            })
            .catch((e) => {
                console.error("Error unloading BBB Meeting:", e);
            });
    });
</script>

<iframe src={actualCowebsite.getUrl().toString()} frameborder="0" height="100%" width="100%" title="Big Blue Button" /> -->

<!-- <script lang="ts">
    import { onMount } from "svelte";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";

    export let actualCowebsite: BBBCoWebsite;

    onMount(() => {
        actualCowebsite.load().catch((e) => {
            console.error(e);
        });
    });

    // Mettre la fonction load du SimpleCoWebsite dans le onMount et le unload dans le onDestroy
</script>

<iframe src={actualCowebsite.getUrl().toString()} frameborder="0" height="100%" width="100%" title="Big Blue Button" /> -->

<!-- <script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";

    export let actualCowebsite: BBBCoWebsite;

    onMount(() => {
        actualCowebsite.load()
            .then(() => {
                console.log("BBB Meeting loaded successfully!");
            })
            .catch((e) => {
                console.error("Error loading BBB Meeting:", e);
            });
    });

    onDestroy(() => {
        actualCowebsite.unload()
            .then(() => {
                console.log("BBB Meeting unloaded successfully!");
            })
            .catch((e) => {
                console.error("Error unloading BBB Meeting:", e);
            });
    });
</script>

<iframe src={actualCowebsite.getUrl().toString()} frameborder="0" height="100%" width="100%" title="Big Blue Button" /> -->

<!-- <script lang="ts">
    import { onMount } from "svelte";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";

    export let actualCowebsite: BBBCoWebsite;

    onMount(() => {
        actualCowebsite.load().catch((e) => {
            console.error(e);
        });
    });

    // Mettre la fonction load du SimpleCoWebsite dans le onMount et le unload dans le onDestroy
</script>

<iframe src={actualCowebsite.getUrl().toString()} frameborder="0" height="100%" width="100%" title="Big Blue Button" /> -->
