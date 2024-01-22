<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { showModalGlobalComminucationVisibilityStore } from "../../Stores/ModalStore";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
    import LL from "../../../i18n/i18n-svelte";
    import TextGlobalMessage from "../Menu/TextGlobalMessage.svelte";
    import AudioGlobalMessage from "../Menu/AudioGlobalMessage.svelte";

    let mainModal: HTMLDivElement;

    let activeLiveMessage = false;
    let inputSendTextActive = false;
    let uploadAudioActive = false;
    let broadcastToWorld = false;
    let handleSendText: { sendTextMessage(broadcast: boolean): void };
    let handleSendAudio: { sendAudioMessage(broadcast: boolean): Promise<void> };

    let isMobile = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
    });

    onMount(() => {
        resizeObserver.observe(mainModal);
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
