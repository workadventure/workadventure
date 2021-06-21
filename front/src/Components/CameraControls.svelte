<script lang="typescript">
    import {requestedScreenSharingState, screenSharingAvailableStore} from "../Stores/ScreenSharingStore";
    import {requestedCameraState, requestedMicrophoneState} from "../Stores/MediaStore";
    import monitorImg from "./images/monitor.svg";
    import monitorCloseImg from "./images/monitor-close.svg";
    import cinemaImg from "./images/cinema.svg";
    import cinemaCloseImg from "./images/cinema-close.svg";
    import microphoneImg from "./images/microphone.svg";
    import microphoneCloseImg from "./images/microphone-close.svg";
    import layoutPresentationImg from "./images/layout-presentation.svg";
    import layoutChatImg from "./images/layout-chat.svg";
    import {layoutModeStore} from "../Stores/StreamableCollectionStore";
    import {LayoutMode} from "../WebRtc/LayoutManager";
    import {peerStore} from "../Stores/PeerStore";

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

    function switchLayoutMode() {
        if ($layoutModeStore === LayoutMode.Presentation) {
            $layoutModeStore = LayoutMode.VideoChat;
        } else {
            $layoutModeStore = LayoutMode.Presentation;
        }
    }
</script>

<div>
    <div class="btn-cam-action">
        <div class="btn-layout" on:click={switchLayoutMode} class:hide={$peerStore.size === 0}>
            {#if $layoutModeStore === LayoutMode.Presentation }
                <img src={layoutPresentationImg} style="padding: 2px" alt="Switch to mosaic mode">
            {:else}
                <img src={layoutChatImg} style="padding: 2px" alt="Switch to presentation mode">
            {/if}
        </div>
        <div class="btn-monitor" on:click={screenSharingClick} class:hide={!$screenSharingAvailableStore} class:enabled={$requestedScreenSharingState}>
            {#if $requestedScreenSharingState}
                <img src={monitorImg} alt="Start screen sharing">
            {:else}
                <img src={monitorCloseImg} alt="Stop screen sharing">
            {/if}
        </div>
        <div class="btn-video" on:click={cameraClick} class:disabled={!$requestedCameraState}>
            {#if $requestedCameraState}
                <img src={cinemaImg} alt="Turn on webcam">
            {:else}
                <img src={cinemaCloseImg} alt="Turn off webcam">
            {/if}
        </div>
        <div class="btn-micro" on:click={microphoneClick} class:disabled={!$requestedMicrophoneState}>
            {#if $requestedMicrophoneState}
                <img src={microphoneImg} alt="Turn on microphone">
            {:else}
                <img src={microphoneCloseImg} alt="Turn off microphone">
            {/if}
        </div>
    </div>
</div>
