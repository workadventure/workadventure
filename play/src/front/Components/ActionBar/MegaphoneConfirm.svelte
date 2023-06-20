<script lang="ts">
    import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
    import { requestedMegaphoneStore } from "../../Stores/MegaphoneStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { LL } from "../../../i18n/i18n-svelte";

    function start() {
        analyticsClient.openMegaphone();
        requestedMegaphoneStore.set(true);
    }
</script>

<div class="megaphone-confirm tw-py-2 tw-px-4 tw-w-60 tw-bg-dark-purple/95 tw-rounded-lg tw-absolute">
    <p class="tw-text-white tw-text-sm">
        {#if !$requestedCameraState && !$requestedMicrophoneState}
            {$LL.warning.megaphoneNeeds()}
        {:else}
            {$LL.megaphone.modal.goingToStream()}
            {$requestedCameraState ? $LL.megaphone.modal.yourCamera() : ""}
            {$requestedCameraState && $requestedMicrophoneState ? $LL.megaphone.modal.and() : ""}
            {$requestedMicrophoneState ? $LL.megaphone.modal.yourMicrophone() : ""}
            {$LL.megaphone.modal.toAll()}.
        {/if}
    </p>
    <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between">
        <button type="button" class="dark">{$LL.megaphone.modal.cancel()}</button>
        <button
            type="button"
            class="light {!$requestedCameraState && !$requestedMicrophoneState ? 'disabled' : ''}"
            on:click={start}
        >
            {$LL.megaphone.modal.confirm()}
        </button>
    </div>
</div>
