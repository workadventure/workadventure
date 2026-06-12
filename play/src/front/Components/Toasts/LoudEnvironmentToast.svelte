<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { requestedMicrophoneState } from "../../Stores/MediaStore";
    import { noiseSuppressionEnabledStore } from "../../Stores/NoiseSuppressionStore";
    import { toastStore } from "../../Stores/ToastStore";
    import ToastContainer from "./ToastContainer.svelte";

    interface Props {
        toastUuid: string;
    }

    let { toastUuid }: Props = $props();

    function closeToast(): void {
        toastStore.removeToast(toastUuid);
    }

    function enableNoiseSuppression(): void {
        noiseSuppressionEnabledStore.setEnabled(true);
        closeToast();
    }

    function turnOffMicrophone(): void {
        requestedMicrophoneState.disableMicrophone();
        closeToast();
    }
</script>

<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" theme="error" {toastUuid}>
    <div class="flex flex-col gap-2">
        <p class="m-0 text-sm leading-snug text-white text-center">
            {$LL.actionbar.microphone.loudEnvironmentWarning()}
        </p>
    </div>
    {#snippet buttons()}
        {#if !$noiseSuppressionEnabledStore}
            <button
                type="button"
                class="btn btn-secondary btn-sm flex-1"
                data-testid="loud-environment-enable-noise-suppression"
                onclick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    enableNoiseSuppression();
                }}
            >
                {$LL.actionbar.microphone.enableNoiseSuppression()}
            </button>
        {/if}
        <button
            type="button"
            class="btn btn-danger btn-sm flex-1"
            data-testid="loud-environment-turn-off-microphone"
            onclick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                turnOffMicrophone();
            }}
        >
            {$LL.actionbar.microphone.turnOffMicrophone()}
        </button>
    {/snippet}
</ToastContainer>
