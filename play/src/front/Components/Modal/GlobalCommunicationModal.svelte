<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { InfoIcon } from "svelte-feather-icons";
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
    import { requestedMegaphoneStore } from "../../Stores/MegaphoneStore";
    import { userIsAdminStore } from "../../Stores/GameStore";

    let mainModal: HTMLDivElement;

    let activeLiveMessage = false;
    let inputSendTextActive = false;
    let uploadAudioActive = false;
    let broadcastToWorld = false;
    let handleSendText: { sendTextMessage(broadcast: boolean): void };
    let handleSendAudio: { sendAudioMessage(broadcast: boolean): Promise<void> };

    let videoElement: HTMLVideoElement;
    let stream: MediaStream | null;
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
            stream = null;
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
    }

    function activateInputText() {
        analyticsClient.globalMessage();
        activeLiveMessage = false;
        inputSendTextActive = true;
        uploadAudioActive = false;
    }

    function activateUploadAudio() {
        analyticsClient.globalMessage();
        activeLiveMessage = false;
        inputSendTextActive = false;
        uploadAudioActive = true;
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
        analyticsClient.openMegaphone();
        requestedMegaphoneStore.set(true);
        close();
    }
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="menu-container {isMobile ? 'mobile' : 'center'} h-3/4" bind:this={mainModal}>
    <div class="w-full bg-dark-purple/95 rounded" transition:fly={{ x: 1000, duration: 500 }}>
        <button type="button" class="close-window" on:click={close}>&times</button>
        <header>
            <h2 class="p-5 blue-title">Global communication</h2>
            {#if activeLiveMessage || inputSendTextActive || uploadAudioActive}
                <!-- svelte-ignore a11y-invalid-attribute -->
                <a
                    href="#"
                    class="px-5 flex flex-row items-center text-xs m-0"
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
        </header>
        <div />
        <div class="h-5/6 px-5 overflow-auto">
            {#if !activeLiveMessage && !inputSendTextActive && !uploadAudioActive}
                <div class="flex flex-row justify-center">
                    <div id="content-liveMessage" class="flex flex-col px-5 w-1/3">
                        <h3>
                            <img
                                src={liveMessageImg}
                                class="h-8 w-8 mr-1"
                                alt={$LL.megaphone.modal.liveMessage.title()}
                            />
                            {$LL.megaphone.modal.liveMessage.title()}
                        </h3>
                        <button class="light max-w-fit" on:click={activateLiveMessage}
                            >{$LL.megaphone.modal.liveMessage.button()}</button
                        >
                        <p class="text-white text-sm whitespace-pre-line">
                            {$LL.megaphone.modal.liveMessage.notice()}
                        </p>
                    </div>
                    <div id="content-textMessage" class="flex flex-col px-5 w-1/3">
                        <h3>
                            <img
                                src={textMessageImg}
                                class="h-8 w-8 mr-1"
                                alt={$LL.megaphone.modal.textMessage.title()}
                            />
                            {$LL.megaphone.modal.textMessage.title()}
                        </h3>
                        <p class="help-text"><InfoIcon size="18" /> {$LL.megaphone.modal.audioMessage.noAccess()}</p>
                        <button class="light max-w-fit" on:click={activateInputText} disabled={!$userIsAdminStore}>
                            {$LL.megaphone.modal.textMessage.button()}</button
                        >
                        <p class="text-white text-sm whitespace-pre-line">
                            {$LL.megaphone.modal.textMessage.notice()}
                        </p>
                    </div>
                    <div id="content-soundMessage" class="flex flex-col px-5 w-1/3">
                        <h3>
                            <img
                                src={audioMessageImg}
                                class="h-8 w-8 mr-1"
                                alt={$LL.megaphone.modal.audioMessage.title()}
                            />
                            {$LL.megaphone.modal.audioMessage.title()}
                        </h3>
                        <p class="help-text"><InfoIcon size="18" /> {$LL.megaphone.modal.audioMessage.noAccess()}</p>
                        <button class="light max-w-fit" on:click={activateUploadAudio} disabled={!$userIsAdminStore}>
                            {$LL.megaphone.modal.audioMessage.button()}</button
                        >
                        <p class="text-white text-sm whitespace-pre-line">
                            {$LL.megaphone.modal.audioMessage.notice()}
                        </p>
                    </div>
                </div>
                <div class="flex flex-row justify-center">
                    <div class="flex flex-col p-5 w-1/3">
                        <div class="flex align-middle justify-center p-5">
                            <video
                                src="https://workadventure-chat-uploads.s3.eu-west-1.amazonaws.com/upload/video/global_live_message.mp4"
                                class="w-full cursor-pointer rounded-xl"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:click={fullScreenVideo}
                            />
                        </div>
                    </div>
                    <div class="flex flex-col p-5 w-1/3">
                        <div class="flex align-middle justify-center p-5">
                            <video
                                src="https://workadventure-chat-uploads.s3.eu-west-1.amazonaws.com/upload/video/global_text_message.mp4"
                                class="w-full cursor-pointer rounded-xl"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:click={fullScreenVideo}
                            />
                        </div>
                    </div>
                    <div class="flex flex-col p-5 w-1/3">
                        <div class="flex align-middle justify-center p-5">
                            <video
                                src="https://workadventure-chat-uploads.s3.eu-west-1.amazonaws.com/upload/video/global_audio_message.mp4"
                                class="w-full cursor-pointer rounded-xl"
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
                        <h3>
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
                        <h3>
                            <img
                                src={audioMessageImg}
                                class="h-8 w-8 mr-1"
                                alt={$LL.megaphone.modal.audioMessage.title()}
                            />
                            {$LL.megaphone.modal.audioMessage.title()}
                        </h3>
                        <AudioGlobalMessage bind:handleSending={handleSendAudio} />
                    {/if}
                    <div class="flex justify-center">
                        <label>
                            <input type="checkbox" bind:checked={broadcastToWorld} />
                            <span>{$LL.menu.globalMessage.warning()}</span>
                        </label>
                    </div>
                    <div class="flex justify-center">
                        <section class="centered-column">
                            <button class="light" on:click|preventDefault={send}>{$LL.menu.globalMessage.send()}</button
                            >
                        </section>
                    </div>
                </div>
            {/if}
            {#if activeLiveMessage}
                <div id="active-liveMessage" class="flex flex-col p-5">
                    <h3>
                        <img src={liveMessageImg} class="h-8 w-8 mr-1" alt={$LL.megaphone.modal.liveMessage.title()} />
                        {$LL.megaphone.modal.liveMessage.title()}
                    </h3>
                    <div class="flex flew-row justify-center">
                        <div class="flex flex-col">
                            <video
                                bind:this={videoElement}
                                class="h-full w-full md:object-cover rounded-xl"
                                class:object-contain={stream && (isMobile || aspectRatio < 1)}
                                class:max-h-[230px]={stream}
                                style="-webkit-transform: scaleX(-1);transform: scaleX(-1);"
                                use:srcObject={stream}
                                autoplay
                                muted
                                playsinline
                            />
                            <div class="z-[251] w-full p-4 flex items-center justify-center scale-150">
                                <SoundMeterWidget
                                    volume={$localVolumeStore}
                                    classcss="!bg-none !bg-transparent scale-150"
                                    barColor="blue"
                                />
                            </div>
                        </div>
                        <div class="flex flex-col pl-6">
                            <h3>{$LL.megaphone.modal.liveMessage.settings()}</h3>
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
                            <div class="flex flex-row">
                                <img
                                    draggable="false"
                                    src={cameraImg}
                                    style="padding: 2px; height: 32px; width: 32px;"
                                    alt="Turn off microphone"
                                />
                                <select class="w-full ml-4" bind:value={cameraDiveId} on:change={() => selectCamera()}>
                                    {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 1}
                                        {#each $cameraListStore as camera (camera.deviceId)}
                                            <option value={camera.deviceId}>
                                                {StringUtils.normalizeDeviceName(camera.label)}
                                            </option>
                                        {/each}
                                    {/if}
                                </select>
                            </div>
                            <div class="flex flex-row">
                                <img
                                    draggable="false"
                                    src={microphoneImg}
                                    style="padding: 2px; height: 32px; width: 32px;"
                                    alt="Turn off microphone"
                                />
                                <select
                                    class="w-full ml-4"
                                    bind:value={microphoneDeviceId}
                                    on:change={() => selectMicrophone()}
                                >
                                    {#if $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 0}
                                        {#each $microphoneListStore as microphone (microphone.deviceId)}
                                            <option value={microphone.deviceId}>
                                                {StringUtils.normalizeDeviceName(microphone.label)}
                                            </option>
                                        {/each}
                                    {/if}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="flex flew-row justify-center">
                        <button
                            class="light"
                            on:click={startLive}
                            disabled={!$requestedCameraState && !$requestedMicrophoneState}>Start live message</button
                        >
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    .menu-container {
        &.mobile {
            width: 100% !important;
            height: 100% !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
        }
    }

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
