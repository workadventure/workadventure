<script lang="ts">
    import { AvailabilityStatus } from "@workadventure/messages";
    import { derived, Readable } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import CamOnIcon from "../../Icons/CamOnIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import CamOffIcon from "../../Icons/CamOffIcon.svelte";
    import {
        availabilityStatusStore,
        mouseIsHoveringCameraButton,
        requestedCameraState,
        silentStore,
    } from "../../../Stores/MediaStore";

    import { openedMenuStore } from "../../../Stores/MenuStore";

    const cameraButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
        [availabilityStatusStore, requestedCameraState],
        ([$availabilityStatusStore, $requestedCameraState]) => {
            if (
                $availabilityStatusStore === AvailabilityStatus.AWAY ||
                $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
                $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB ||
                $silentStore === true
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

<ActionBarButton
    on:click={cameraClick}
    classList="group/btn-cam"
    disabledHelp={$openedMenuStore !== undefined}
    state={$cameraButtonStateStore}
    dataTestId="camera-button"
    on:mouseenter={() => mouseIsHoveringCameraButton.set(true)}
    on:mouseleave={() => mouseIsHoveringCameraButton.set(false)}
>
    {#if $requestedCameraState && !$silentStore}
        <CamOnIcon />
    {:else}
        <CamOffIcon />
    {/if}
</ActionBarButton>

<!-- <ActionBarButton
    on:click={cameraClick}
    classList="group/btn-cam"
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
    on:mouseenter={() => mouseIsHoveringCameraButton.set(true)}
    on:mouseleave={() => mouseIsHoveringCameraButton.set(false)}
>
    {#if $requestedCameraState && !$silentStore}
        <CamOnIcon />
    {:else}
        <CamOffIcon />
    {/if}
</ActionBarButton> -->
