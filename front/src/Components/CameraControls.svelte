<script lang="typescript">
    import {requestedScreenSharingState, screenSharingAvailableStore} from "../Stores/ScreenSharingStore";
    import {requestedCameraState, requestedMicrophoneState} from "../Stores/MediaStore";
    import monitorImg from "./images/monitor.svg";
    import monitorCloseImg from "./images/monitor-close.svg";
    import cinemaImg from "./images/cinema.svg";
    import cinemaCloseImg from "./images/cinema-close.svg";
    import microphoneImg from "./images/microphone.svg";
    import microphoneCloseImg from "./images/microphone-close.svg";

    function screenSharingClick(): void {
        if ($requestedScreenSharingState === true) {
            requestedScreenSharingState.disableScreenSharing();
        } else {
            requestedScreenSharingState.enableScreenSharing();
        }
    }

    function cameraClick(): void {
        if ($requestedCameraState === true) {
            requestedCameraState.disableWebcam();
        } else {
            requestedCameraState.enableWebcam();
        }
    }

    function microphoneClick(): void {
        if ($requestedMicrophoneState === true) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    }

</script>

<div class="btn-cam-action">
    <div class="btn-monitor" on:click={screenSharingClick} class:hide={!$screenSharingAvailableStore}>
        {#if $requestedScreenSharingState}
            <img src={monitorImg} alt="Start screen sharing">
        {:else}
            <img src={monitorCloseImg} alt="Stop screen sharing">
        {/if}
    </div>
    <div class="btn-video" on:click={cameraClick}>
        {#if $requestedCameraState}
            <img src={cinemaImg} alt="Turn on webcam">
        {:else}
            <img src={cinemaCloseImg} alt="Turn off webcam">
        {/if}
    </div>
    <div class="btn-micro" on:click={microphoneClick}>
        {#if $requestedMicrophoneState}
            <img src={microphoneImg} alt="Turn on microphone">
        {:else}
            <img src={microphoneCloseImg} alt="Turn off microphone">
        {/if}
    </div>
</div>
