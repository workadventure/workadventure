<script lang="ts">
    import { AvailabilityStatus } from "@workadventure/messages";
    import { derived, Readable } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { getStatusLabel } from "../../../Utils/AvailabilityStatus";
    import CamOnIcon from "../../Icons/CamOnIcon.svelte";
    import ActionBarIconButton from "../ActionBarIconButton.svelte";
    import CamOffIcon from "../../Icons/CamOffIcon.svelte";
    import ActionBarButtonWrapper from "../ActionBarButtonWrapper.svelte";
    import { availabilityStatusStore, requestedCameraState, silentStore } from "../../../Stores/MediaStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore } from "../../../Stores/MenuStore";

    const cameraButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
        [availabilityStatusStore, requestedCameraState],
        ([$availabilityStatusStore, $requestedCameraState]) => {
            if (
                $availabilityStatusStore === AvailabilityStatus.AWAY ||
                $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
                $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB
            ) {
                return "disabled";
            }
            return $requestedCameraState ? "normal" : "forbidden";
        }
    );

    function cameraClick(): void {
        analyticsClient.camera();
        if ($silentStore) return;
        if ($requestedCameraState === true) {
            requestedCameraState.disableWebcam();
        } else {
            requestedCameraState.enableWebcam();
        }
    }
</script>

<ActionBarButtonWrapper classList="group/btn-cam">
    <ActionBarIconButton
        on:click={cameraClick}
        tooltipTitle={$cameraButtonStateStore === "disabled"
            ? $LL.actionbar.help.camDisabledByStatus.title()
            : $LL.actionbar.help.cam.title()}
        tooltipDesc={$cameraButtonStateStore === "disabled"
            ? $LL.actionbar.help.camDisabledByStatus.desc({
                  status: getStatusLabel($availabilityStatusStore),
              })
            : $LL.actionbar.help.cam.desc()}
        disabledHelp={$openedMenuStore !== undefined}
        state={$cameraButtonStateStore}
        dataTestId="camera-button"
    >
        {#if $requestedCameraState && !$silentStore}
            <CamOnIcon />
        {:else}
            <CamOffIcon />
        {/if}
    </ActionBarIconButton>
</ActionBarButtonWrapper>
