<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { cameraUnavailableStore, requestedCameraState, retryCamera } from "../../Stores/MediaStore";
    import Button from "../UI/Button.svelte";
    import ToastContainer from "./ToastContainer.svelte";

    interface Props {
        toastUuid: string;
    }

    let { toastUuid }: Props = $props();
</script>

<!-- Removed by startCameraStallDetector once the camera is back, or turned off -->
<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" theme="error" {toastUuid}>
    <div class="flex flex-col gap-2">
        <p class="m-0 text-sm leading-snug text-white text-center">
            {$cameraUnavailableStore === "in_use" ? $LL.camera.unavailable.inUse() : $LL.camera.unavailable.noImage()}
        </p>
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
