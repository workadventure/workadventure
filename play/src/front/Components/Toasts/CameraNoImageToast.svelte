<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { mediaSettingsOpenStore } from "../../Stores/MenuStore";
    import { requestedCameraState } from "../../Stores/MediaStore";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import Button from "../UI/Button.svelte";
    import ToastContainer from "./ToastContainer.svelte";

    interface Props {
        toastUuid: string;
    }

    let { toastUuid }: Props = $props();

    function retry(): void {
        requestedCameraState.enableWebcam();
        closeToast();
    }

    function changeCamera(): void {
        // The camera list only shows while the camera is on
        requestedCameraState.enableWebcam();
        mediaSettingsOpenStore.set(true);
        closeToast();
    }

    function closeToast(): void {
        // Remove toast on next tick so the store update is flushed and the settings panel can open first
        setTimeout(() => {
            toastStore.removeToast(toastUuid);
        }, 0);
    }
</script>

<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" theme="error" {toastUuid}>
    <div class="flex flex-col gap-2">
        <p class="m-0 text-sm leading-snug text-white text-center">
            {$LL.actionbar.camera.noImageWarning()}
        </p>
    </div>
    {#snippet buttons()}
        <Button
            appearance="ghost"
            size="sm"
            class="flex-1"
            dataTestId="camera-no-image-retry"
            onclick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                retry();
            }}
        >
            {$LL.actionbar.camera.retry()}
        </Button>
        <Button
            type="button"
            variant="danger"
            size="sm"
            class="flex-1"
            dataTestId="camera-no-image-change-camera"
            onclick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                changeCamera();
            }}
        >
            {$LL.actionbar.camera.changeCamera()}
        </Button>
    {/snippet}
</ToastContainer>
