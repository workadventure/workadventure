<script lang="ts">
    import { AvailabilityStatus } from "@workadventure/messages";
    import { derived, Readable } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { getStatusLabel } from "../../../Utils/AvailabilityStatus";
    import ActionBarIconButton from "../ActionBarIconButton.svelte";
    import ActionBarButtonWrapper from "../ActionBarButtonWrapper.svelte";
    import { availabilityStatusStore, requestedMicrophoneState, silentStore } from "../../../Stores/MediaStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore } from "../../../Stores/MenuStore";

    import MicOnIcon from "../../Icons/MicOnIcon.svelte";
    import MicOffIcon from "../../Icons/MicOffIcon.svelte";

    const microphoneButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
        [availabilityStatusStore, requestedMicrophoneState],
        ([$availabilityStatusStore, $requestedMicrophoneState]) => {
            if (
                $availabilityStatusStore === AvailabilityStatus.AWAY ||
                $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
                $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB
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

<ActionBarButtonWrapper classList="group/btn-mic peer/mic">
    <ActionBarIconButton
        on:click={microphoneClick}
        tooltipTitle={$microphoneButtonStateStore === "disabled"
            ? $LL.actionbar.help.micDisabledByStatus.title()
            : $LL.actionbar.help.mic.title()}
        tooltipDesc={$microphoneButtonStateStore === "disabled"
            ? $LL.actionbar.help.micDisabledByStatus.desc({
                  status: getStatusLabel($availabilityStatusStore),
              })
            : $LL.actionbar.help.mic.desc()}
        disabledHelp={$openedMenuStore !== undefined}
        state={$microphoneButtonStateStore}
        dataTestId="microphone-button"
    >
        {#if $requestedMicrophoneState && !$silentStore}
            <MicOnIcon />
        {:else}
            <MicOffIcon />
        {/if}
    </ActionBarIconButton>
</ActionBarButtonWrapper>
