<script lang="ts">
    import { AvailabilityStatus } from "@workadventure/messages";
    import { derived, Readable } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { availabilityStatusStore, requestedMicrophoneState, silentStore } from "../../../Stores/MediaStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";

    import MicOnIcon from "../../Icons/MicOnIcon.svelte";
    import MicOffIcon from "../../Icons/MicOffIcon.svelte";

    const microphoneButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
        [availabilityStatusStore, requestedMicrophoneState],
        ([$availabilityStatusStore, $requestedMicrophoneState]) => {
            if (
                $availabilityStatusStore === AvailabilityStatus.AWAY ||
                $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
                $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB ||
                $silentStore === true
            ) {
                return "disabled";
            }
            return $requestedMicrophoneState ? "normal" : "forbidden";
        }
    );

    function microphoneClick(): void {
        analyticsClient.microphone();
        if ($silentStore) return;
        if ($requestedMicrophoneState === true) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    }
</script>

<ActionBarButton
    on:click={microphoneClick}
    classList="group/btn-mic peer/mic"
    disabledHelp={$openedMenuStore !== undefined}
    state={$microphoneButtonStateStore}
    dataTestId="microphone-button"
>
    {#if $requestedMicrophoneState && !$silentStore}
        <MicOnIcon />
    {:else}
        <MicOffIcon />
    {/if}
</ActionBarButton>
