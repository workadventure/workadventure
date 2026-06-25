<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
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
</script>

<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" theme="error" {toastUuid}>
    <p class="m-0 text-sm leading-snug text-white text-center">
        {$LL.actionbar.microphone.loudEnvironmentWarning()}
    </p>
    {#snippet buttons()}
        <button
            type="button"
            class="btn btn-ghost btn-sm flex-1"
            data-testid="loud-environment-ignore"
            onclick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                closeToast();
            }}
        >
            {$LL.actionbar.microphone.ignore()}
        </button>
        <button
            type="button"
            class="btn btn-danger btn-sm flex-1"
            data-testid="loud-environment-enable-noise-suppression"
            onclick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                enableNoiseSuppression();
            }}
        >
            {$LL.actionbar.microphone.enableNoiseSuppression()}
        </button>
    {/snippet}
</ToastContainer>
