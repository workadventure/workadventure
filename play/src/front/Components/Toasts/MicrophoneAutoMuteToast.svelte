<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { requestedMicrophoneState } from "../../Stores/MediaStore";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import MicOffIcon from "../Icons/MicOffIcon.svelte";
    import ToastContainer from "./ToastContainer.svelte";

    interface Props {
        toastUuid?: string;
        duration?: number;
    }

    let { toastUuid = "", duration = 8000 }: Props = $props();

    function unmute(): void {
        requestedMicrophoneState.enableMicrophone();
        toastStore.removeToast(toastUuid);
    }
</script>

<!-- Narrower than the default TextToast (~2/3 the width) and using the secondary theme colour, with a
     small muted-microphone icon. Warns the user they were auto-muted on entering a busy meeting and
     offers a one-click "Unmute". -->
<ToastContainer extraClasses="w-full max-w-[16rem] sm:max-w-[18rem]" theme="secondary" {toastUuid} {duration}>
    <div class="flex items-center justify-center gap-2">
        <MicOffIcon height="h-5" width="w-5" classList="shrink-0" ariaLabel="Microphone muted" />
        <span class="text-sm leading-snug">{$LL.notification.microphoneAutoMuted()}</span>
    </div>
    {#snippet buttons()}
        <button class="btn btn-secondary btn-sm w-full" data-testid="microphone-automute-unmute" onclick={unmute}>
            {$LL.notification.unmute()}
        </button>
    {/snippet}
</ToastContainer>
