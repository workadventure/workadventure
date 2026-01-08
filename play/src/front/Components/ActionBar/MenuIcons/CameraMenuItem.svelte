<script lang="ts">
    import { AvailabilityStatus } from "@workadventure/messages";
    import type { Readable } from "svelte/store";
    import { derived } from "svelte/store";
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
                $availabilityStatusStore === AvailabilityStatus.BUSY ||
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
    on:mouseenter={() => {
        if ($availabilityStatusStore === AvailabilityStatus.ONLINE) mouseIsHoveringCameraButton.set(true);
        else mouseIsHoveringCameraButton.set(false);
    }}
    on:mouseleave={() => mouseIsHoveringCameraButton.set(false)}
>
    {#if $requestedCameraState && !$silentStore}
        <CamOnIcon />
    {:else}
        <CamOffIcon />
    {/if}
</ActionBarButton>
