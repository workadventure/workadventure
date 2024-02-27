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
    import microphoneImg from "../images/microphone.png";
    import cameraImg from "../images/camera.png";
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

<div class="menu-container {isMobile ? 'mobile' : 'center'} tw-h-3/4" bind:this={mainModal}>
    <div class="tw-w-full tw-bg-dark-purple/95 tw-rounded" transition:fly={{ x: 1000, duration: 500 }}>
        <button type="button" class="close-window" on:pointerdown={close}>&times</button>
        <header>
            <h2 class="tw-p-5 blue-title">Global communication</h2>
            {#if activeLiveMessage || inputSendTextActive || uploadAudioActive}
                <!-- svelte-ignore a11y-invalid-attribute -->
                <a
                    href="#"
                    class="tw-px-5 tw-flex tw-flex-row tw-items-center tw-text-xs tw-m-0"
                    on:pointerdown|preventDefault|stopPropagation={() => back()}
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
                        class="feather feather-arrow-left tw-cursor-pointer"
                        ><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg
                    >
                    <span class="tw-ml-1 tw-cursor-pointer">Back to select communication</span>
                </a>
            {/if}
        </header>
        <div />
        <div class="tw-h-5/6 tw-px-5 tw-overflow-auto">
            {#if !activeLiveMessage && !inputSendTextActive && !uploadAudioActive}
                <div class="tw-flex tw-flex-row tw-justify-center">
                    <div id="content-liveMessage" class="tw-flex tw-flex-col tw-px-5 tw-w-1/3">
                        <h3>
                            <img
                                src={liveMessageImg}
                                class="tw-h-8 tw-w-8 tw-mr-1"
                                alt={$LL.megaphone.modal.liveMessage.title()}
                            />
                            {$LL.megaphone.modal.liveMessage.title()}
                        </h3>
                        <button class="light tw-max-w-fit" on:pointerdown={activateLiveMessage}
                            >{$LL.megaphone.modal.liveMessage.button()}</button
                        >
                        <p class="tw-text-white tw-text-sm tw-whitespace-pre-line">
                            {$LL.megaphone.modal.liveMessage.notice()}
                        </p>
                    </div>
                    <div id="content-textMessage" class="tw-flex tw-flex-col tw-px-5 tw-w-1/3">
                        <h3>
                            <img
                                src={textMessageImg}
                                class="tw-h-8 tw-w-8 tw-mr-1"
                                alt={$LL.megaphone.modal.textMessage.title()}
                            />
                            {$LL.megaphone.modal.textMessage.title()}
                        </h3>
                        <p class="help-text"><InfoIcon size="18" /> {$LL.megaphone.modal.audioMessage.noAccess()}</p>
                        <button
                            class="light tw-max-w-fit"
                            on:pointerdown={activateInputText}
                            disabled={!$userIsAdminStore}
                        >
                            {$LL.megaphone.modal.textMessage.button()}</button
                        >
                        <p class="tw-text-white tw-text-sm tw-whitespace-pre-line">
                            {$LL.megaphone.modal.textMessage.notice()}
                        </p>
                    </div>
                    <div id="content-soundMessage" class="tw-flex tw-flex-col tw-px-5 tw-w-1/3">
                        <h3>
                            <img
                                src={audioMessageImg}
                                class="tw-h-8 tw-w-8 tw-mr-1"
                                alt={$LL.megaphone.modal.audioMessage.title()}
                            />
                            {$LL.megaphone.modal.audioMessage.title()}
                        </h3>
                        <p class="help-text"><InfoIcon size="18" /> {$LL.megaphone.modal.audioMessage.noAccess()}</p>
                        <button
                            class="light tw-max-w-fit"
                            on:pointerdown={activateUploadAudio}
                            disabled={!$userIsAdminStore}
                        >
                            {$LL.megaphone.modal.audioMessage.button()}</button
                        >
                        <p class="tw-text-white tw-text-sm tw-whitespace-pre-line">
                            {$LL.megaphone.modal.audioMessage.notice()}
                        </p>
                    </div>
                </div>
                <div class="tw-flex tw-flex-row tw-justify-center">
                    <div class="tw-flex tw-flex-col tw-p-5 tw-w-1/3">
                        <div class="tw-flex tw-align-middle tw-justify-center tw-p-5">
                            <video
                                src="/resources/videos/global_text_message.mp4"
                                class="tw-w-full tw-cursor-pointer tw-rounded-xl"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:pointerdown={fullScreenVideo}
                            />
                        </div>
                    </div>
                    <div class="tw-flex tw-flex-col tw-p-5 tw-w-1/3">
                        <div class="tw-flex tw-align-middle tw-justify-center tw-p-5">
                            <video
                                src="/resources/videos/global_text_message.mp4"
                                class="tw-w-full tw-cursor-pointer tw-rounded-xl"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:pointerdown={fullScreenVideo}
                            />
                        </div>
                    </div>
                    <div class="tw-flex tw-flex-col tw-p-5 tw-w-1/3">
                        <div class="tw-flex tw-align-middle tw-justify-center tw-p-5">
                            <video
                                src="/resources/videos/global_audio_message.mp4"
                                class="tw-w-full tw-cursor-pointer tw-rounded-xl"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:pointerdown={fullScreenVideo}
                            />
                        </div>
                    </div>
                </div>
            {/if}

            {#if inputSendTextActive || uploadAudioActive}
                <div id="active-globalMessage" class="tw-flex tw-flex-col tw-p-5">
                    {#if inputSendTextActive}
                        <h3>
                            <img
                                src={textMessageImg}
                                class="tw-h-8 tw-w-8 tw-mr-1"
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
                                class="tw-h-8 tw-w-8 tw-mr-1"
                                alt={$LL.megaphone.modal.audioMessage.title()}
                            />
                            {$LL.megaphone.modal.audioMessage.title()}
                        </h3>
                        <AudioGlobalMessage bind:handleSending={handleSendAudio} />
                    {/if}
                    <div class="tw-flex tw-justify-center">
                        <label>
                            <input type="checkbox" bind:checked={broadcastToWorld} />
                            <span>{$LL.menu.globalMessage.warning()}</span>
                        </label>
                    </div>
                    <div class="tw-flex tw-justify-center">
                        <section class="centered-column">
                            <button class="light" on:pointerdown|preventDefault={send}
                                >{$LL.menu.globalMessage.send()}</button
                            >
                        </section>
                    </div>
                </div>
            {/if}
            {#if activeLiveMessage}
                <div id="active-liveMessage" class="tw-flex tw-flex-col tw-p-5">
                    <h3>
                        <img
                            src={liveMessageImg}
                            class="tw-h-8 tw-w-8 tw-mr-1"
                            alt={$LL.megaphone.modal.liveMessage.title()}
                        />
                        {$LL.megaphone.modal.liveMessage.title()}
                    </h3>
                    <div class="tw-flex tw-flew-row tw-justify-center">
                        <div class="tw-flex tw-flex-col">
                            <video
                                bind:this={videoElement}
                                class="tw-h-full tw-w-full md:tw-object-cover tw-rounded-xl"
                                class:object-contain={stream && (isMobile || aspectRatio < 1)}
                                class:tw-max-h-[230px]={stream}
                                style="-webkit-transform: scaleX(-1);transform: scaleX(-1);"
                                use:srcObject={stream}
                                autoplay
                                muted
                                playsinline
                            />
                            <div
                                class="tw-z-[251] tw-w-full tw-p-4 tw-flex tw-items-center tw-justify-center tw-scale-150"
                            >
                                <SoundMeterWidget
                                    volume={$localVolumeStore}
                                    classcss="!tw-bg-none !tw-bg-transparent tw-scale-150"
                                    barColor="blue"
                                />
                            </div>
                        </div>
                        <div class="tw-flex tw-flex-col tw-pl-6">
                            <h3>{$LL.megaphone.modal.liveMessage.settings()}</h3>
                            <p class="tw-text-white tw-text-sm">
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
                            <div class="tw-flex tw-flex-row">
                                <img
                                    draggable="false"
                                    src={cameraImg}
                                    style="padding: 2px; height: 32px; width: 32px;"
                                    alt="Turn off microphone"
                                />
                                <select
                                    class="tw-w-full tw-ml-4"
                                    bind:value={cameraDiveId}
                                    on:change={() => selectCamera()}
                                >
                                    {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 1}
                                        {#each $cameraListStore as camera (camera.deviceId)}
                                            <option value={camera.deviceId}>
                                                {StringUtils.normalizeDeviceName(camera.label)}
                                            </option>
                                        {/each}
                                    {/if}
                                </select>
                            </div>
                            <div class="tw-flex tw-flex-row">
                                <img
                                    draggable="false"
                                    src={microphoneImg}
                                    style="padding: 2px; height: 32px; width: 32px;"
                                    alt="Turn off microphone"
                                />
                                <select
                                    class="tw-w-full tw-ml-4"
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
                    <div class="tw-flex tw-flew-row tw-justify-center">
                        <button
                            class="light"
                            on:pointerdown={startLive}
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
