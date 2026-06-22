<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import ToastContainer from "./ToastContainer.svelte";

    interface Props {
        toastUuid: string;
        startAudio: () => Promise<void>;
    }

    let { toastUuid, startAudio }: Props = $props();
    let isStarting = $state(false);

    function handleStartAudio(): void {
        isStarting = true;
        startAudio()
            .catch((error: unknown) => {
                console.error("Could not restart LiveKit audio playback", error);
            })
            .finally(() => {
                isStarting = false;
            });
    }
</script>

<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" theme="error" {toastUuid}>
    <div class="flex flex-col gap-2">
        <p class="m-0 text-sm leading-snug text-white text-center">
            {$LL.statusModal.livekitAudioPlaybackBlocked()}
        </p>
    </div>
    {#snippet buttons()}
        <button
            type="button"
            class="btn btn-danger btn-sm flex-1"
            data-testid="livekit-restart-audio"
            disabled={isStarting}
            onclick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                handleStartAudio();
            }}
        >
            {$LL.statusModal.turnSoundOn()}
        </button>
    {/snippet}
</ToastContainer>
