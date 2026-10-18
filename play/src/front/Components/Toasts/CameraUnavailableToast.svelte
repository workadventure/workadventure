<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import {
        cameraListStore,
        cameraUnavailableStore,
        disconnectedCameraStore,
        requestedCameraState,
        retryCamera,
        switchToCamera,
        usedCameraDeviceIdStore,
    } from "../../Stores/MediaStore";
    import Button from "../UI/Button.svelte";
    import ToastContainer from "./ToastContainer.svelte";

    interface Props {
        toastUuid: string;
    }

    let { toastUuid }: Props = $props();

    let message = $derived.by(() => {
        if ($cameraUnavailableStore === "in_use") {
            return $LL.camera.unavailable.inUse();
        }
        if ($cameraUnavailableStore === "disconnected") {
            return $LL.camera.unavailable.disconnected({ camera: $disconnectedCameraStore?.label ?? "" });
        }
        return $LL.camera.unavailable.noImage();
    });

    // Never switched to behind the user's back: offered here
    let otherCameras = $derived(
        ($cameraListStore ?? []).filter(
            (camera) => camera.deviceId !== ($disconnectedCameraStore?.deviceId ?? $usedCameraDeviceIdStore),
        ),
    );
</script>

<!-- Removed by startCameraStallDetector once the camera is back, or turned off -->
<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" theme="error" {toastUuid}>
    <div class="flex flex-col gap-2">
        <p class="m-0 text-sm leading-snug text-white text-center">{message}</p>
        {#each otherCameras as camera (camera.deviceId)}
            <Button
                appearance="border"
                size="sm"
                dataTestId="camera-unavailable-use"
                onclick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    switchToCamera(camera.deviceId);
                }}
            >
                {$LL.camera.unavailable.useCamera({ camera: camera.label })}
            </Button>
        {/each}
    </div>
    {#snippet buttons()}
        <Button
            appearance="ghost"
            size="sm"
            class="flex-1"
            dataTestId="camera-unavailable-retry"
            onclick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                retryCamera();
            }}
        >
            {$LL.camera.unavailable.retry()}
        </Button>
        <Button
            type="button"
            variant="danger"
            size="sm"
            class="flex-1"
            dataTestId="camera-unavailable-turn-off"
            onclick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                requestedCameraState.disableWebcam();
            }}
        >
            {$LL.camera.unavailable.turnOff()}
        </Button>
    {/snippet}
</ToastContainer>
