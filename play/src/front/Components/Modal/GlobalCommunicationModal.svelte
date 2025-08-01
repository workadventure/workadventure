<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { showModalGlobalComminucationVisibilityStore } from "../../Stores/ModalStore";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import {
        cameraListStore,
        localStreamStore,
        localVolumeStore,
        microphoneListStore,
        requestedCameraDeviceIdStore,
        requestedCameraState,
        requestedMicrophoneDeviceIdStore,
        requestedMicrophoneState,
        streamingMegaphoneStore,
    } from "../../Stores/MediaStore";
    import LL from "../../../i18n/i18n-svelte";
    import microphoneImg from "../images/mic.svg";
    import cameraImg from "../images/cam.svg";
    import liveMessageImg from "../images/live-message.svg";
    import textMessageImg from "../images/text-message.svg";
    import audioMessageImg from "../images/audio-message.svg";
    import TextGlobalMessage from "../Menu/TextGlobalMessage.svelte";
    import AudioGlobalMessage from "../Menu/AudioGlobalMessage.svelte";
    import { srcObject } from "../Video/utils";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { StringUtils } from "../../Utils/StringUtils";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import {
        currentLiveStreamingSpaceStore,
        megaphoneCanBeUsedStore,
        megaphoneSpaceStore,
        requestedMegaphoneStore,
    } from "../../Stores/MegaphoneStore";
    import { userIsAdminStore } from "../../Stores/GameStore";
    import Tooltip from "../Util/Tooltip.svelte";
    import Alert from "../UI/Alert.svelte";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import Select from "../Input/Select.svelte";
    import InputCheckbox from "../Input/InputCheckbox.svelte";
    import { IconAlertTriangle, IconInfoCircle } from "@wa-icons";

    let mainModal: HTMLDivElement;

    let activeLiveMessage = false;
    let inputSendTextActive = false;
    let uploadAudioActive = false;
    let broadcastToWorld = false;
    let handleSendText: { sendTextMessage(broadcast: boolean): void };
    let handleSendAudio: { sendAudioMessage(broadcast: boolean): Promise<void> };

    let videoElement: HTMLVideoElement;
    let stream: MediaStream | undefined;
    let aspectRatio = 1;

    let isMobile = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
    });

    const unsubscribeLocalStreamStore = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;
            // TODO: remove this hack
            setTimeout(() => {
                aspectRatio = videoElement != undefined ? videoElement.videoWidth / videoElement.videoHeight : 1;
            }, 100);
        } else {
            stream = undefined;
        }
    });

    onMount(() => {
        resizeObserver.observe(mainModal);
    });

    onDestroy(() => {
        unsubscribeLocalStreamStore();
    });

    function close() {
        streamingMegaphoneStore.set(false);
        showModalGlobalComminucationVisibilityStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }

    function activateLiveMessage() {
        streamingMegaphoneStore.set(true);
        activeLiveMessage = true;
        inputSendTextActive = false;
        uploadAudioActive = false;
        analyticsClient.openMegaphone();
    }

    function activateInputText() {
        activeLiveMessage = false;
        inputSendTextActive = true;
        uploadAudioActive = false;
        analyticsClient.openGlobalMessage();
    }

    function activateUploadAudio() {
        activeLiveMessage = false;
        inputSendTextActive = false;
        uploadAudioActive = true;
        analyticsClient.openGlobalAudio();
    }

    function back() {
        activeLiveMessage = false;
        inputSendTextActive = false;
        uploadAudioActive = false;
    }

    async function send(): Promise<void> {
        if (inputSendTextActive) {
            analyticsClient.sendGlocalTextMessage();
            handleSendText.sendTextMessage(broadcastToWorld);
        }
        if (uploadAudioActive) {
            analyticsClient.sendGlobalSoundMessage();
            await handleSendAudio.sendAudioMessage(broadcastToWorld);
        }
        close();
    }

    // function to play video
    function playVideo(event: MouseEvent) {
        if (!(event.target instanceof HTMLVideoElement)) return;
        // play video
        event.target.play().catch(() => console.error("error playing video"));
    }

    // function to stop video
    function stopVideo(event: MouseEvent) {
        if (!(event.target instanceof HTMLVideoElement)) return;
        // stop video
        event.target.pause();
    }

    // function to put full screen video
    function fullScreenVideo(event: MouseEvent) {
        if (!(event.target instanceof HTMLVideoElement)) return;
        // full screen video
        event.target.requestFullscreen().catch(() => console.error("error playing video"));
    }

    let cameraDiveId: string;
    function selectCamera() {
        requestedCameraDeviceIdStore.set(cameraDiveId);
        localUserStore.setPreferredVideoInputDevice(cameraDiveId);
    }

    let microphoneDeviceId: string;
    function selectMicrophone() {
        requestedMicrophoneDeviceIdStore.set(microphoneDeviceId);
        localUserStore.setPreferredAudioInputDevice(microphoneDeviceId);
    }

    function startLive() {
        analyticsClient.startMegaphone();
        currentLiveStreamingSpaceStore.set($megaphoneSpaceStore);
        requestedMegaphoneStore.set(true);
        $megaphoneSpaceStore?.emitUpdateUser({
            megaphoneState: true,
        });
        //close();
    }

    function stopLive() {
        analyticsClient.stopMegaphone();
        $megaphoneSpaceStore?.emitUpdateUser({
            megaphoneState: false,
        });
        currentLiveStreamingSpaceStore.set(undefined);
        requestedMegaphoneStore.set(false);
        close();
    }
</script>

<svelte:window on:keydown={onKeyDown} />

<div
    class="absolute z-[308] rounded-xxl w-full h-full top-0 left-0 right-0 bottom-0 flex items-center justify-center  overflow-hidden"
    bind:this={mainModal}
>
    <div
        class="h-full md:h-auto md:top-auto md:left-auto  md:right-auto md:bottom-auto bg-contrast/80 backdrop-blur rounded-md max-h-screen overflow-y-auto w-full lg:w-11/12"
        transition:fly={{ x: 1000, duration: 500 }}
    >
        <!-- <div class="bg-contrast/80 ml-2 -right-20 top-4 transition-all backdrop-blur rounded-lg p-2 aspect-square">
            <button type="button" class="close-window h-[16px] w-[16px] bg-red-500 justify-center" on:click|preventDefault|stopPropagation={close}
                >&times</button
            >
        </div> -->
        <header class="flex flex-row items-start justify-between p-2">
            <div class="flex flex-col gap-2 p-4">
                <h2 class="text-center text-white mobile text-base md:text-xl lg:text-2xl">Global communication</h2>

                {#if activeLiveMessage || inputSendTextActive || uploadAudioActive}
                    <!-- svelte-ignore a11y-invalid-attribute -->
                    <a
                        href="#"
                        class="px-4 py-2 text-white no-underline bg-white/10 rounded hover:bg-white/20 flex flex-row items-center text-xs m-0 w-fit"
                        on:click|preventDefault|stopPropagation={() => back()}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12px"
                            height="12px"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="feather feather-arrow-left cursor-pointer"
                            ><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg
                        >
                        <span class="ml-1 cursor-pointer">Back to select communication</span>
                    </a>
                {/if}
            </div>
            <div class="group/btn-chat  transition-all" id="btn-chat">
                <ButtonClose on:click={close} />
            </div>
        </header>
        <div class="px-5 h-full ">
            {#if !activeLiveMessage && !inputSendTextActive && !uploadAudioActive}
                <div class="flex flex-col md:flex-row md:justify-center h-full">
                    <div
                        id="content-liveMessage"
                        class="flex flex-col md:w-1/3 w-full px-5 mb-6  h-full justify-between"
                    >
                        <h4 class="text-white mb-2">
                            <img
                                src={liveMessageImg}
                                class="h-8 w-8 mr-1 inline"
                                alt={$LL.megaphone.modal.liveMessage.title()}
                            />
                            {$LL.megaphone.modal.liveMessage.title()}
                        </h4>

                        <button
                            class="btn-lg btn btn-light btn-border mt-2 mb-4"
                            on:click={activateLiveMessage}
                            disabled={!$megaphoneCanBeUsedStore}
                        >
                            {$LL.megaphone.modal.liveMessage.button()}
                        </button>

                        {#if !$megaphoneCanBeUsedStore}
                            <Alert>
                                <p class="help-text flex items-center">
                                    <IconInfoCircle class="mr-2 mb-1 min-w-6" font-size="20" />
                                    {$LL.megaphone.modal.audioMessage.noAccess()}
                                </p>
                            </Alert>
                        {/if}

                        <p class="text-white text-sm whitespace-pre-line">
                            {$LL.megaphone.modal.liveMessage.notice()}
                        </p>

                        <div class="mt-auto pt-4">
                            <video
                                src="https://workadventure-chat-uploads.s3.eu-west-1.amazonaws.com/upload/video/global_live_message.mp4"
                                class="w-full cursor-pointer rounded"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:click={fullScreenVideo}
                            />
                        </div>
                    </div>

                    <div
                        id="content-textMessage"
                        class="flex flex-col md:w-1/3 w-full px-5 mb-6  h-full justify-between"
                    >
                        <h4 class="text-white mb-2">
                            <img
                                src={textMessageImg}
                                class="h-8 w-8 mr-1 inline"
                                alt={$LL.megaphone.modal.textMessage.title()}
                            />
                            {$LL.megaphone.modal.textMessage.title()}
                        </h4>

                        <button
                            class="btn-lg btn btn-light btn-border mb-4"
                            on:click={activateInputText}
                            disabled={!$userIsAdminStore}
                        >
                            {$LL.megaphone.modal.textMessage.button()}
                        </button>

                        {#if !$userIsAdminStore}
                            <Alert>
                                <p class="help-text flex items-center">
                                    <IconInfoCircle class="mr-2 mb-1 min-w-6" font-size="18" />
                                    {$LL.megaphone.modal.textMessage.noAccess()}
                                </p>
                            </Alert>
                        {/if}

                        <p class="text-white text-sm whitespace-pre-line">
                            {$LL.megaphone.modal.textMessage.notice()}
                        </p>

                        <div class="mt-auto pt-4">
                            <video
                                src="https://workadventure-chat-uploads.s3.eu-west-1.amazonaws.com/upload/video/global_text_message.mp4"
                                class="w-full cursor-pointer rounded"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:click={fullScreenVideo}
                            />
                        </div>
                    </div>

                    <div
                        id="content-soundMessage"
                        class="flex flex-col md:w-1/3 w-full px-5 mb-6 h-full justify-between"
                    >
                        <h4 class="text-white mb-2">
                            <img
                                src={audioMessageImg}
                                class="h-8 w-8 mr-1 inline"
                                alt={$LL.megaphone.modal.audioMessage.title()}
                            />
                            {$LL.megaphone.modal.audioMessage.title()}
                        </h4>

                        <button
                            class="btn-lg btn btn-light btn-border mb-4"
                            on:click={activateUploadAudio}
                            disabled={!$userIsAdminStore}
                        >
                            {$LL.megaphone.modal.audioMessage.button()}
                        </button>

                        {#if !$userIsAdminStore}
                            <Alert>
                                <p class="help-text flex items-center">
                                    <IconInfoCircle class="mr-2 mb-1 min-w-6" font-size="18" />
                                    {$LL.megaphone.modal.audioMessage.noAccess()}
                                </p>
                            </Alert>
                        {/if}

                        <p class="text-white text-sm whitespace-pre-line">
                            {$LL.megaphone.modal.audioMessage.notice()}
                        </p>

                        <div class="mt-auto pt-4">
                            <video
                                src="https://workadventure-chat-uploads.s3.eu-west-1.amazonaws.com/upload/video/global_audio_message.mp4"
                                class="w-full cursor-pointer rounded"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:click={fullScreenVideo}
                            />
                        </div>
                    </div>
                </div>
            {/if}

            {#if inputSendTextActive || uploadAudioActive}
                <div id="active-globalMessage" class="flex flex-col p-5">
                    {#if inputSendTextActive}
                        <h3 class="text-white mb-2">
                            <img
                                src={textMessageImg}
                                class="h-8 w-8 mr-1"
                                alt={$LL.megaphone.modal.textMessage.title()}
                            />
                            {$LL.megaphone.modal.textMessage.title()}
                        </h3>
                        <TextGlobalMessage bind:handleSending={handleSendText} />
                    {/if}

                    {#if uploadAudioActive}
                        <div class="flex  flex-col justify-center items-center">
                            <h3 class="text-white ">
                                <img
                                    src={audioMessageImg}
                                    class="h-8 w-8 mr-1"
                                    alt={$LL.megaphone.modal.audioMessage.title()}
                                />
                                {$LL.megaphone.modal.audioMessage.title()}
                            </h3>
                            <div class="text-white">
                                <AudioGlobalMessage bind:handleSending={handleSendAudio} />
                            </div>
                        </div>
                    {/if}
                    <div class="flex justify-center">
                        <InputCheckbox label={$LL.menu.globalMessage.warning()} bind:value={broadcastToWorld} />
                    </div>
                    <div class="flex justify-center">
                        <section class="centered-column">
                            <button class="btn btn-light" on:click|preventDefault={send}
                                >{$LL.menu.globalMessage.send()}</button
                            >
                        </section>
                    </div>
                </div>
            {/if}
            {#if activeLiveMessage}
                <div id="active-liveMessage" class="flex flex-col p-5 text-white ">
                    <div>
                        <h3>
                            <img
                                src={liveMessageImg}
                                class="h-8 w-8 mr-1 text-white"
                                alt={$LL.megaphone.modal.liveMessage.title()}
                            />
                            {$LL.megaphone.modal.liveMessage.title()}
                        </h3>
                    </div>

                    <div class="flex flex-col md:flex-row justify-center">
                        <div class="flex flex-col mr-5">
                            <video
                                bind:this={videoElement}
                                class="h-full w-full md:object-cover rounded"
                                class:object-contain={stream && (isMobile || aspectRatio < 1)}
                                class:max-h-[230px]={stream}
                                style="-webkit-transform: scaleX(-1);transform: scaleX(-1);"
                                use:srcObject={stream}
                                autoplay
                                muted
                                playsinline
                            />
                            <div class="z-[251] mt-3 w-full p-4 flex items-center justify-center scale-150">
                                <SoundMeterWidget
                                    volume={$localVolumeStore}
                                    cssClass="!bg-none !bg-transparent scale-150"
                                    barColor="blue"
                                />
                            </div>
                        </div>
                        <div class="flex flex-col pl-6">
                            <h3 class="text-white ">{$LL.megaphone.modal.liveMessage.settings()}</h3>
                            <p class="text-white text-sm">
                                {#if !$requestedCameraState && !$requestedMicrophoneState && !$requestedScreenSharingState}
                                    {$LL.warning.megaphoneNeeds()}
                                {:else}
                                    {$LL.megaphone.modal.liveMessage.goingToStream()}
                                    {$requestedCameraState ? $LL.megaphone.modal.liveMessage.yourCamera() : ""}
                                    {$requestedCameraState && $requestedMicrophoneState && !$requestedScreenSharingState
                                        ? $LL.megaphone.modal.liveMessage.and()
                                        : ""}
                                    {$requestedCameraState && $requestedMicrophoneState && $requestedScreenSharingState
                                        ? ","
                                        : ""}
                                    {$requestedMicrophoneState ? $LL.megaphone.modal.liveMessage.yourMicrophone() : ""}
                                    {($requestedCameraState || $requestedMicrophoneState) &&
                                    $requestedScreenSharingState
                                        ? $LL.megaphone.modal.liveMessage.and()
                                        : ""}
                                    {$requestedScreenSharingState ? $LL.megaphone.modal.liveMessage.yourScreen() : ""}
                                    {$LL.megaphone.modal.liveMessage.toAll()}.
                                {/if}
                            </p>
                            <div class="flex flex-row items-center gap-3">
                                <img
                                    draggable="false"
                                    src={cameraImg}
                                    style="padding: 2px; height: 32px; width: 32px;"
                                    alt="Turn off microphone"
                                />
                                <div class="w-full">
                                    <Select bind:value={cameraDiveId} on:change={() => selectCamera()}>
                                        {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 1}
                                            {#each $cameraListStore as camera (camera.deviceId)}
                                                <option value={camera.deviceId}>
                                                    {StringUtils.normalizeDeviceName(camera.label)}
                                                </option>
                                            {/each}
                                        {/if}
                                    </Select>
                                </div>
                            </div>
                            <div class="flex flex-row items-center gap-3 ">
                                <img
                                    draggable="false"
                                    src={microphoneImg}
                                    style="padding: 2px; height: 32px; width: 32px; "
                                    alt="Turn off microphone"
                                />
                                <div class="w-full ">
                                    <Select bind:value={microphoneDeviceId} on:change={() => selectMicrophone()}>
                                        {#if $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 0}
                                            {#each $microphoneListStore as microphone (microphone.deviceId)}
                                                <option value={microphone.deviceId}>
                                                    {StringUtils.normalizeDeviceName(microphone.label)}
                                                </option>
                                            {/each}
                                        {/if}
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex flew-row justify-center">
                        {#if !$requestedCameraState && !$requestedMicrophoneState && !$requestedScreenSharingState}
                            <span class="err text-warning-900 text-xs italic mt-1">
                                <IconAlertTriangle font-size="12" />
                                {$LL.warning.megaphoneNeeds()}
                            </span>
                        {/if}
                    </div>
                    <div class="flex flew-row justify-center">
                        {#if !$requestedMegaphoneStore}
                            <button
                                class="btn light  text-black bg-white mt-4 rounded-md"
                                on:click={startLive}
                                disabled={!$requestedCameraState && !$requestedMicrophoneState}
                            >
                                {#if !$requestedCameraState && !$requestedMicrophoneState && !$requestedScreenSharingState}
                                    <Tooltip text={$LL.warning.megaphoneNeeds()} />
                                {/if}
                                {$LL.megaphone.modal.liveMessage.startMegaphone()}
                            </button>
                        {:else}
                            <button class="btn btn-danger" on:click={stopLive}>
                                {$LL.megaphone.modal.liveMessage.stopMegaphone()}
                            </button>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    video {
        transition: all 0.2s ease-in-out;
        &:hover {
            scale: 1.1;
        }
    }

    button.light[disabled] {
        background-color: #4a5568;
        cursor: not-allowed;
    }
</style>
