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
        cameraButtonHelpContextStore,
        cameraListStore,
        mouseIsHoveringCameraButton,
        requestedCameraState,
        silentStore,
    } from "../../../Stores/MediaStore";

    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { getNavigatorType, isAndroid, NavigatorType } from "../../../WebRtc/DeviceUtils";

    const cameraButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
        [availabilityStatusStore, requestedCameraState, cameraListStore],
        ([$availabilityStatusStore, $requestedCameraState, $cameraListStore]) => {
            if (
                $availabilityStatusStore === AvailabilityStatus.BUSY ||
                $availabilityStatusStore === AvailabilityStatus.AWAY ||
                $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
                $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB ||
                $silentStore === true ||
                ($cameraListStore !== undefined && $cameraListStore.length === 0)
            ) {
                return "disabled";
            }
            return $requestedCameraState ? "normal" : "forbidden";
        }
    );

    const cameraActionBarTooltipStore = derived(
        [LL, cameraButtonHelpContextStore, requestedCameraState, silentStore, availabilityStatusStore],
        ([$LL, ctx, camOn, silent, status]) => {
            const permissionMedia = (() => {
                try {
                    if (isAndroid()) {
                        return $LL.camera.help.tooltip.permissionMedia.android();
                    }
                    const nt = getNavigatorType();
                    if (nt === NavigatorType.firefox) {
                        return $LL.camera.help.tooltip.permissionMedia.firefox();
                    }
                    if (nt === NavigatorType.chrome) {
                        return $LL.camera.help.tooltip.permissionMedia.chrome();
                    }
                    if (nt === NavigatorType.safari) {
                        return $LL.camera.help.tooltip.permissionMedia.safari();
                    }
                } catch {
                    // getNavigatorType() throws on some embedded or uncommon browsers
                }
                return $LL.camera.help.tooltip.permissionMedia.default();
            })();

            if (ctx === "permission") {
                return {
                    title: $LL.camera.help.tooltip.permissionDeniedTitle(),
                    desc: $LL.camera.help.tooltip.permissionDeniedDesc(),
                    media: permissionMedia,
                };
            }
            if (ctx === "no_device") {
                return {
                    title: $LL.camera.help.tooltip.noDeviceTitle(),
                    desc: $LL.camera.help.tooltip.noDeviceDesc(),
                    media: "",
                };
            }
            return { title: "", desc: "", media: "" };
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
    tooltipTitle={$cameraActionBarTooltipStore.title}
    desc={$cameraActionBarTooltipStore.desc}
    media={$cameraActionBarTooltipStore.media}
    on:mouseenter={() => {
        if ($availabilityStatusStore === AvailabilityStatus.ONLINE) mouseIsHoveringCameraButton.set(true);
        else mouseIsHoveringCameraButton.set(false);
    }}
    on:mouseleave={() => mouseIsHoveringCameraButton.set(false)}
>
    {#if $requestedCameraState && !$silentStore && $cameraListStore && $cameraListStore.length > 0}
        <CamOnIcon />
    {:else}
        <CamOffIcon />
    {/if}
</ActionBarButton>
