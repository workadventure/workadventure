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
    import microphoneImg from "../images/microphone.png";
    import cameraImg from "../images/camera.png";
    import TextGlobalMessage from "../Menu/TextGlobalMessage.svelte";
    import AudioGlobalMessage from "../Menu/AudioGlobalMessage.svelte";
    import { srcObject } from "../Video/utils";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { StringUtils } from "../../Utils/StringUtils";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { requestedMegaphoneStore } from "../../Stores/MegaphoneStore";

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
        activeLiveMessage = false;
        inputSendTextActive = true;
        uploadAudioActive = false;
    }

    function activateUploadAudio() {
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
            handleSendText.sendTextMessage(broadcastToWorld);
        }
        if (uploadAudioActive) {
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

<div class="menu-container {isMobile ? 'mobile' : 'center'} tw-h-auto" bind:this={mainModal}>
    <div class="tw-w-full tw-bg-dark-purple/95 tw-rounded" transition:fly={{ x: 1000, duration: 500 }}>
        <button type="button" class="close-window" on:click={close}>&times</button>
        <header>
            <h2 class="tw-p-5 blue-title">Global communication</h2>
            {#if activeLiveMessage || inputSendTextActive || uploadAudioActive}
                <!-- svelte-ignore a11y-invalid-attribute -->
                <a
                    href="#"
                    class="tw-px-5 tw-flex tw-flex-row tw-items-center tw-text-xs tw-m-0"
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
                        class="feather feather-arrow-left tw-cursor-pointer"
                        ><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg
                    >
                    <span class="tw-ml-1 tw-cursor-pointer">Back to select communication</span>
                </a>
            {/if}
        </header>
        <div />
        <div class="tw-p-5">
            {#if !activeLiveMessage && !inputSendTextActive && !uploadAudioActive}
                <div class="tw-flex tw-flex-row tw-justify-center">
                    <div class="tw-flex tw-flex-col tw-p-5 tw-w-1/3">
                        <h3>Live message</h3>
                        <p class="tw-text-white tw-text-sm">
                            {#if !$requestedCameraState && !$requestedMicrophoneState && !$requestedScreenSharingState}
                                {$LL.warning.megaphoneNeeds()}
                            {:else}
                                {$LL.megaphone.modal.goingToStream()}
                                {$requestedCameraState ? $LL.megaphone.modal.yourCamera() : ""}
                                {$requestedCameraState && $requestedMicrophoneState && !$requestedScreenSharingState
                                    ? $LL.megaphone.modal.and()
                                    : ""}
                                {$requestedCameraState && $requestedMicrophoneState && $requestedScreenSharingState
                                    ? ","
                                    : ""}
                                {$requestedMicrophoneState ? $LL.megaphone.modal.yourMicrophone() : ""}
                                {($requestedCameraState || $requestedMicrophoneState) && $requestedScreenSharingState
                                    ? $LL.megaphone.modal.and()
                                    : ""}
                                {$requestedScreenSharingState ? $LL.megaphone.modal.yourScreen() : ""}
                                {$LL.megaphone.modal.toAll()}.
                            {/if}
                        </p>
                    </div>
                    <div class="tw-flex tw-flex-col tw-p-5 tw-w-1/3">
                        <h3>Text message</h3>
                        <p class="tw-text-white tw-text-sm">
                            Le text message permet d'envoyer un message à toutes les personnes connecté dans le salon ou
                            le world.
                        </p>
                        <p class="tw-text-white tw-text-sm">
                            Ce message sera affiché sous forme de popup en haut de la page et sera accompagné d'un son
                            permettant d'identifier qu'une information est à lire.
                        </p>
                        <p class="tw-text-white tw-text-sm">
                            Un exemple de message : "La conférence de la salle 3 commence dans 2 minutes 🎉. Vous pouvez
                            vous rendre dans la zone de conférence 3 et ouvire l'application de visio 🚀"
                        </p>
                    </div>
                    <div class="tw-flex tw-flex-col tw-p-5 tw-w-1/3">
                        <h3>Audio message</h3>
                        <p class="tw-text-white tw-text-sm">
                            L'audio message est un message de type "MP3, OGG..." envoyé à tous les utilisateurs connecté
                            dans le salon ou dans le world.
                        </p>
                        <p class="tw-text-white tw-text-sm">
                            Ce message audio sera téléchargé et lancé à toute les personnes recevant cette notification.
                        </p>
                        <p class="tw-text-white tw-text-sm">
                            Un exemple de message auio peut être un enregistrement audio pour indiquer qu'une conférence
                            va démarrer dans quelques minutes.
                        </p>
                    </div>
                </div>
                <div class="tw-flex tw-flex-row tw-justify-center">
                    <div class="tw-flex tw-flex-col tw-p-5 tw-w-1/3">
                        <div class="tw-flex tw-align-middle tw-justify-center tw-p-5">
                            <video
                                src="/resources/videos/global_text_message.mov"
                                class="tw-w-full tw-cursor-pointer"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:click={fullScreenVideo}
                            />
                        </div>
                        <button class="light" on:click={activateLiveMessage}>Start live message</button>
                    </div>
                    <div class="tw-flex tw-flex-col tw-p-5 tw-w-1/3">
                        <div class="tw-flex tw-align-middle tw-justify-center tw-p-5">
                            <video
                                src="/resources/videos/global_text_message.mov"
                                class="tw-w-full tw-cursor-pointer"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:click={fullScreenVideo}
                            />
                        </div>
                        <button class="light" on:click={activateInputText}>Start text message</button>
                    </div>
                    <div class="tw-flex tw-flex-col tw-p-5 tw-w-1/3">
                        <div class="tw-flex tw-align-middle tw-justify-center tw-p-5">
                            <video
                                src="/resources/videos/global_text_message.mov"
                                class="tw-w-full tw-cursor-pointer"
                                controls
                                muted
                                on:mouseover={playVideo}
                                on:mouseout={stopVideo}
                                on:click={fullScreenVideo}
                            />
                        </div>
                        <button class="light" on:click={activateUploadAudio}>Start audio message</button>
                    </div>
                </div>
            {/if}

            {#if inputSendTextActive || uploadAudioActive}
                <div class="tw-flex tw-flex-col tw-p-5">
                    {#if inputSendTextActive}
                        <TextGlobalMessage bind:handleSending={handleSendText} />
                    {/if}
                    {#if uploadAudioActive}
                        <AudioGlobalMessage bind:handleSending={handleSendAudio} />
                    {/if}
                    <div>
                        <label>
                            <input type="checkbox" bind:checked={broadcastToWorld} />
                            <span>{$LL.menu.globalMessage.warning()}</span>
                        </label>
                        <section class="centered-column">
                            <button class="light" on:click|preventDefault={send}>{$LL.menu.globalMessage.send()}</button
                            >
                        </section>
                    </div>
                </div>
            {/if}
            {#if activeLiveMessage}
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
                        <div class="tw-z-[251] tw-w-full tw-p-4 tw-flex tw-items-center tw-justify-center tw-scale-150">
                            <SoundMeterWidget
                                volume={$localVolumeStore}
                                classcss="!tw-bg-none !tw-bg-transparent tw-scale-150"
                                barColor="blue"
                            />
                        </div>
                    </div>
                    <div class="tw-flex tw-flex-col tw-pl-6">
                        <h3>Settings</h3>
                        {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 1}
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
                                    {#each $cameraListStore as camera (camera.deviceId)}
                                        <option value={camera.deviceId}>
                                            {StringUtils.normalizeDeviceName(camera.label)}
                                        </option>
                                    {/each}
                                </select>
                            </div>
                        {/if}
                        {#if $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 0}
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
                                    {#each $microphoneListStore as microphone (microphone.deviceId)}
                                        <option value={microphone.deviceId}>
                                            {StringUtils.normalizeDeviceName(microphone.label)}
                                        </option>
                                    {/each}
                                </select>
                            </div>
                        {/if}
                    </div>
                </div>
                <div class="tw-flex tw-flew-row tw-justify-center">
                    <button class="light" on:click={startLive}>Start live message</button>
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
</style>
