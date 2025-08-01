<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { recordingStore } from "../../Stores/RecordingStore";
    import StartRecordingIcon from "../Icons/StartRecordingIcon.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";

    let progress = 0;
    let interval: ReturnType<typeof setInterval>;

    onMount(() => {
        const duration = 5000;
        const step = 50;
        let elapsed = 0;

        interval = setInterval(() => {
            elapsed += step;
            progress = Math.min((elapsed / duration) * 100, 100);
            if (elapsed >= duration) {
                clearInterval(interval);
                recordingStore.hideInfoPopup();
            }
        }, step);
    });

    onDestroy(() => {
        clearInterval(interval);
    });
</script>

<PopUpContainer reduceOnSmallScreen={true} extraClasses="absolute top-0 right-2 z-[999] ">
    <div class="absolute top-0 left-0 w-full h-1 overflow-hidden">
        <div class="h-full bg-secondary/50" style="width: {progress}%" />
    </div>
    <div class="flex flex-row items-center justify-start gap-2">
        <div class="bg-white/10 rounded-md flex items-center justify-center p-3">
            <StartRecordingIcon height="h-8" width="w-8" />
        </div>
        <p class="text-center">One person in the discussion has started a recording.</p>
    </div>
    <svelte:fragment slot="buttons">
        <button
            class="btn btn-secondary btn-sm w-full"
            on:click={() => {
                recordingStore.hideInfoPopup();
            }}
        >
            Ok
        </button>
    </svelte:fragment>
</PopUpContainer>
