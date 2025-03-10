<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { EnableCameraScene } from "../../Phaser/Login/EnableCameraScene";
    import { EnableCameraSceneName } from "../../Phaser/Login/EnableCameraScene";
    import {
        requestedCameraDeviceIdStore,
        batchGetUserMediaStore,
        cameraListStore,
        localStreamStore,
        localVolumeStore,
        requestedMicrophoneDeviceIdStore,
        microphoneListStore,
        speakerListStore,
        requestedCameraState,
        requestedMicrophoneState,
        speakerSelectedStore,
    } from "../../Stores/MediaStore";
    import type { Game } from "../../Phaser/Game/Game";
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import { StringUtils } from "../../Utils/StringUtils";
    import { myCameraStore, myMicrophoneStore } from "../../Stores/MyMediaStore";
    import { localUserStore } from "../../Connection/LocalUserStore";

    export let game: Game;
    import { gameManager } from "../../Phaser/Game/GameManager";
    import CamOnIcon from "../Icons/CamOnIcon.svelte";
    import CamOffIcon from "../Icons/CamOffIcon.svelte";
    import MicOnIcon from "../Icons/MicOnIcon.svelte";
    import CheckIcon from "../Icons/CheckIcon.svelte";
    import MicOffIcon from "../Icons/MicOffIcon.svelte";
    import VolumeIcon from "../Icons/VolumeIcon.svelte";
    import bgMap from "../images/map-exemple.png";
    import HorizontalSoundMeterWidget from "./HorizontalSoundMeterWidget.svelte";

    const enableCameraScene = game.scene.getScene(EnableCameraSceneName) as EnableCameraScene;
    const bgColor = gameManager.currentStartedRoom.backgroundColor ?? "#1B2A41";
    let legals = gameManager.currentStartedRoom?.legals ?? {};

    let cameraEdit = false;
    let microphoneEdit = false;
    let speakerEdit = false;
    let selectedCamera: string | undefined = undefined;
    let selectedMicrophone: string | undefined = undefined;
    // let selectedSpeaker: string | undefined = undefined;
    const sound = new Audio("/resources/objects/webrtc-in.mp3");

    let legalStrings: string[] = [];
    if (legals?.termsOfUseUrl) {
        legalStrings.push(
            '<a href="' +
                encodeURI(legals.termsOfUseUrl) +
                '" target="_blank" class="text-white no-underline hover:underline bold hover:text-white">' +
                $LL.login.termsOfUse() +
                "</a>"
        );
    }
    if (legals?.privacyPolicyUrl) {
        legalStrings.push(
            '<a href="' +
                encodeURI(legals.privacyPolicyUrl) +
                '" target="_blank" class="text-white no-underline hover:underline bold hover:text-white">' +
                $LL.login.privacyPolicy() +
                "</a>"
        );
    }
    if (legals?.cookiePolicyUrl) {
        legalStrings.push(
            '<a href="' +
                encodeURI(legals.cookiePolicyUrl) +
                '" target="_blank" class="text-white no-underline hover:underline bold hover:text-white">' +
                $LL.login.cookiePolicy() +
                "</a>"
        );
    }

    let legalString: string | undefined;
    if (legalStrings.length > 0) {
        if (Intl.ListFormat) {
            const formatter = new Intl.ListFormat($locale, { style: "long", type: "conjunction" });
            legalString = formatter.format(legalStrings);
        } else {
            // For old browsers
            legalString = legalStrings.join(", ");
        }
    }

    function submit() {
        selectCamera(selectedCamera);
        selectMicrophone(selectedMicrophone);
        enableCameraScene.login();
    }

    function srcObject(node: HTMLVideoElement, stream: MediaStream) {
        node.srcObject = stream;
        return {
            update(newStream: MediaStream) {
                if (node.srcObject != newStream) {
                    node.srcObject = newStream;
                }
            },
        };
    }

    let stream: MediaStream | undefined;

    const unsubscribeLocalStreamStore = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;

            if (stream !== undefined) {
                const videoTracks = stream.getVideoTracks();
                if (videoTracks.length > 0) {
                    selectedCamera = videoTracks[0].getSettings().deviceId;
                } else {
                    selectedCamera = undefined;
                }
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    selectedMicrophone = audioTracks[0].getSettings().deviceId;
                } else {
                    selectedMicrophone = undefined;
                }
            }
        } else {
            stream = undefined;
            selectedCamera = undefined;
            selectedMicrophone = undefined;
        }
    });

    onDestroy(() => {
        unsubscribeLocalStreamStore();
    });

    onMount(() => {
        //init the component to enable webcam and microphone
        batchGetUserMediaStore.startBatch();
        myCameraStore.set(true);
        myMicrophoneStore.set(true);
        requestedCameraState.enableWebcam();
        console.log("localUserStore.getRequestedCameraState();");
        console.log(localUserStore.getRequestedCameraState());

        requestedMicrophoneState.enableMicrophone();
        console.log("localUserStore.getRequestedMicrophoneState");
        console.log(localUserStore.getRequestedMicrophoneState());

        batchGetUserMediaStore.commitChanges();
        sound.load();
    });

    function selectCamera(selectedCamera: string | undefined = undefined) {
        if (selectedCamera == undefined) {
            localUserStore.setPreferredVideoInputDevice("");
            requestedCameraState.disableWebcam();
            return;
        }
        requestedCameraState.enableWebcam();
        requestedCameraDeviceIdStore.set(selectedCamera);
        localUserStore.setPreferredVideoInputDevice(selectedCamera);
    }

    function selectMicrophone(selectedMicrophone: string | undefined = undefined) {
        if (selectedMicrophone == undefined) {
            localUserStore.setPreferredAudioInputDevice("");
            requestedMicrophoneState.disableMicrophone();
            return;
        }
        requestedMicrophoneState.enableMicrophone();
        requestedMicrophoneDeviceIdStore.set(selectedMicrophone);
        localUserStore.setPreferredAudioInputDevice(selectedMicrophone);
    }

    function selectSpeaker(deviceId: string | undefined) {
        localUserStore.setSpeakerDeviceId(deviceId ?? "");
        speakerSelectedStore.set(deviceId);
    }

    function playSoundClick() {
        sound.play().catch((e) => console.error(e));
    }
</script>

<form class="enableCameraScene pointer-events-auto relative z-30 m-0" on:submit|preventDefault={submit}>
    <section class="flex items-center justify-center min-h-screen ">
        <div class="text-white container mx-auto flex flex-col items-center justify-center min-h-screen pb-24 relative">
            <section class="mb-4 text-center">
                <h2 class="h4">{$LL.camera.enable.title()}</h2>
                <p class="opacity-50 w-2/3 m-auto">
                    {$LL.camera.enable.start()}
                </p>
            </section>

            <div class="flex space-x-4 items-center flex-col lg:flex-row items-stretch">
                <div
                    class="px-4 pt-4 pb-2 rounded-lg bg-white/10 mt-4 max-w-[450px] flex flex-col lg:min-h-[24rem] items-center"
                >
                    <div class="text-lg bold flex items-center justify-center space-x-3 mb-2 pl-2 ">
                        <MicOnIcon height="h-8" width="w-8" />
                        <div class="grow pr-8">{$LL.actionbar.subtitle.microphone()}</div>
                        <button
                            class="btn {!microphoneEdit ? 'btn-secondary' : 'btn-light btn-ghost'}"
                            on:click|stopPropagation|preventDefault={() => (microphoneEdit = !microphoneEdit)}
                        >
                            {!microphoneEdit ? $LL.actionbar.edit() : $LL.actionbar.cancel()}
                        </button>
                    </div>

                    <div class="flex items-center justify-center">
                        <div class="flex flex-wrap items-center justify-center min-h-[129px]">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div
                                class="border border-solid  min-w-[25em] border-white rounded-lg relative items-center justify-start m-2 space-x-4  transition-all overflow-hidden cursor-pointer   px-6 py-6 {selectedMicrophone ===
                                undefined
                                    ? 'bg-white text-secondary pt-5'
                                    : ' hover:bg-white/10 pt-4'} "
                                class:hidden={!microphoneEdit && selectedMicrophone !== undefined}
                                class:flex={microphoneEdit || selectedMicrophone === undefined}
                                on:click={() => {
                                    selectMicrophone(undefined);
                                    microphoneEdit = false;
                                }}
                            >
                                <div
                                    class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center "
                                    class:bg-secondary={selectedMicrophone === undefined}
                                    class:border-secondary={selectedMicrophone === undefined}
                                >
                                    {#if selectedMicrophone == undefined}
                                        <CheckIcon width="w-4" height="h-4" />
                                    {/if}
                                </div>

                                <div class="space-y-1">
                                    <div
                                        class="text-lg bold max-w-[241px] truncate text-ellipsis overflow-hidden leading-tight flex  self-start"
                                    >
                                        {#if microphoneEdit && selectedMicrophone !== undefined}
                                            <MicOffIcon height="h-4" width="w-4" />
                                        {/if}

                                        {$LL.audio.disable()}
                                    </div>
                                    {#if selectedMicrophone === undefined}
                                        <span class="chip chip-sm chip-neutral inline rounded-sm rounded-sm">
                                            <span class="chip-label">{$LL.camera.active()}</span>
                                        </span>
                                    {:else}
                                        <span class="chip chip-sm chip-neutral inline rounded-sm">
                                            <span class="chip-label">{$LL.camera.notRecommended()}</span>
                                        </span>
                                    {/if}
                                </div>
                            </div>
                            {#each $microphoneListStore ?? [] as microphone (microphone.deviceId)}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="border border-solid border-white min-w-[25em]  rounded-lg pr-8 pl-6 pb-4 m-2  items-center justify-start transition-all overflow-hidden cursor-pointer relative px-8 py-6 {selectedMicrophone ===
                                    microphone.deviceId
                                        ? 'bg-white text-secondary pt-12'
                                        : 'hover:bg-white/10 pt-4'}"
                                    class:hidden={!microphoneEdit && selectedMicrophone !== microphone.deviceId}
                                    class:flex={microphoneEdit || selectedMicrophone === microphone.deviceId}
                                    on:click={() => {
                                        selectMicrophone(microphone.deviceId);
                                        microphoneEdit = false;
                                    }}
                                >
                                    {#if microphone.deviceId === selectedMicrophone}
                                        <div class="absolute top-4 left-0 flex justify-center w-full ">
                                            <HorizontalSoundMeterWidget spectrum={$localVolumeStore} />
                                        </div>
                                    {/if}
                                    <div
                                        class="aspect-square mr-4 h-6 rounded-full border border-solid border-white flex items-center justify-center "
                                        class:bg-secondary={selectedMicrophone === microphone.deviceId}
                                        class:border-secondary={selectedMicrophone === microphone.deviceId}
                                    >
                                        {#if selectedMicrophone == microphone.deviceId}
                                            <CheckIcon width="w-4" height="h-4" />
                                        {/if}
                                    </div>
                                    <div class="space-y-1">
                                        <div
                                            class="text-lg bold max-w-[241px] truncate text-ellipsis overflow-hidden leading-tight"
                                        >
                                            {StringUtils.normalizeDeviceName(microphone.label)}
                                        </div>
                                        {#if microphone.deviceId === selectedMicrophone}
                                            <span class="chip chip-sm chip-neutral inline rounded-sm rounded-sm">
                                                <span class="chip-label">{$LL.camera.active()}</span>
                                            </span>
                                        {:else}
                                            <span class="chip chip-sm chip-neutral inline rounded-sm">
                                                <span class="chip-label">{$LL.camera.disabled()}</span>
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                <div
                    class="px-4 pt-4 pb-2 rounded-lg bg-white/10 mt-4 max-w-[450px] min-w-[28em] flex flex-col  items-center lg:min-h-[24rem]"
                >
                    <div class="text-lg bold flex items-center justify-center space-x-3 mb-2 pl-2">
                        <CamOnIcon height="h-8" width="w-8" />
                        <div class="grow pr-8">{$LL.camera.editCam()}</div>
                        <button
                            class="btn {!cameraEdit ? 'btn-secondary' : 'btn-light btn-ghost'}"
                            on:click|stopPropagation|preventDefault={() => (cameraEdit = !cameraEdit)}
                        >
                            {!cameraEdit ? $LL.actionbar.edit() : $LL.actionbar.cancel()}
                        </button>
                    </div>
                    <div class="flex justify-center">
                        <div
                            class="flex items-center justify-center flex flex-wrap
                        "
                        >
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div
                                class=" border border-solid  border-white min-w-[25em] rounded-lg items-center justify-start m-2 space-x-4 transition-all cursor-pointer overflow-hidden  {selectedCamera ==
                                undefined
                                    ? 'bg-white text-secondary border-none'
                                    : 'hover:bg-white/10'}"
                                class:hidden={!cameraEdit && selectedCamera !== undefined}
                                class:flex,flex-col={cameraEdit || selectedCamera === undefined}
                                on:click={() => {
                                    selectCamera(undefined);
                                    cameraEdit = false;
                                }}
                            >
                                {#if !cameraEdit && selectedCamera == undefined}
                                    <div
                                        class="webrtcsetup flex items-center justify-center h-[200px] w-full aspect-video overflow-hidden bg-contrast"
                                    >
                                        <CamOffIcon />
                                    </div>
                                {/if}
                                <div class="flex py-4 pr-8 pl-4 items-center space-x-4">
                                    <div
                                        class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center  "
                                        class:bg-secondary={selectedCamera === undefined}
                                        class:border-secondary={selectedCamera === undefined}
                                    >
                                        {#if selectedCamera == undefined}
                                            <CheckIcon width="w-4" height="h-4" />
                                        {/if}
                                    </div>
                                    <div class="space-y-1">
                                        <div
                                            class="text-lg bold max-w-[241px] truncate text-ellipsis overflow-hidden leading-tight"
                                        >
                                            {$LL.camera.disable()}
                                        </div>
                                        {#if selectedCamera == undefined}
                                            <span class="chip chip-sm chip-neutral inline rounded-sm rounded-sm">
                                                <span class="chip-label">{$LL.camera.active()}</span>
                                            </span>
                                        {:else}
                                            <span class="chip chip-sm chip-neutral inline rounded-sm">
                                                <span class="chip-label">{$LL.camera.notRecommended()}</span>
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                            {#each $cameraListStore ?? [] as camera (camera.deviceId)}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="border border-solid min-w-[25em] rounded-lg relative justify-start m-2 space-x-4 transition-all overflow-hidden cursor-pointer {selectedCamera ===
                                    camera.deviceId
                                        ? 'bg-white text-secondary border-none '
                                        : 'border-white hover:bg-white/10'}"
                                    class:hidden={!cameraEdit && selectedCamera !== camera.deviceId}
                                    class:flex,flex-col={cameraEdit || selectedCamera === camera.deviceId}
                                    on:click={() => {
                                        selectCamera(camera.deviceId);
                                        cameraEdit = false;
                                    }}
                                >
                                    {#if !cameraEdit && camera.deviceId === selectedCamera}
                                        {#if selectedCamera !== undefined && $localStreamStore.type === "success" && $localStreamStore.stream}
                                            <video
                                                class="myCamVideoSetup flex items-center  justify-center h-[230px]  aspect-video overflow-hidden scale-x-[-1]"
                                                use:srcObject={$localStreamStore.stream}
                                                autoplay
                                                muted
                                                playsinline
                                            />
                                        {:else}
                                            <div
                                                class="webrtcsetup flex items-center justify-center w-full aspect-video rounded-lg overflow-hidden bg-contrast"
                                            >
                                                CAM PB <!-- TODO HUGO : catch pb with cam -->
                                            </div>
                                        {/if}
                                    {/if}
                                    <div class="flex py-4 pr-8 pl-4 items-center space-x-4">
                                        <div
                                            class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center "
                                            class:bg-secondary={selectedCamera === camera.deviceId}
                                            class:border-secondary={selectedCamera === camera.deviceId}
                                        >
                                            {#if selectedCamera == camera.deviceId}
                                                <CheckIcon width="w-4" height="h-4" />
                                            {/if}
                                        </div>
                                        <div class="space-y-1">
                                            <div
                                                class="text-lg bold  truncate text-ellipsis overflow-hidden leading-tight"
                                                style:width={!cameraEdit && selectedCamera === camera.deviceId
                                                    ? "251px"
                                                    : "auto"}
                                            >
                                                {StringUtils.normalizeDeviceName(camera.label)}
                                            </div>
                                            {#if camera.deviceId === selectedCamera}
                                                <span class="chip chip-sm chip-neutral inline rounded-sm rounded-sm">
                                                    <span class="chip-label">{$LL.camera.active()}</span>
                                                </span>
                                            {:else}
                                                <span class="chip chip-sm chip-neutral inline rounded-sm ">
                                                    <span class="chip-label">{$LL.camera.disabled()} C</span>
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                {#if $speakerSelectedStore != undefined && $speakerListStore && $speakerListStore.length > 0}
                    <div
                        class="px-4 pt-4 pb-2 rounded-lg bg-white/10 mt-4 max-w-[450px]  flex flex-col lg:min-h-[24rem] items-center"
                    >
                        <div class="text-lg bold flex items-center justify-center space-x-3 mb-2 pl-2">
                            <VolumeIcon height="h-8" width="w-8" />
                            <div class="grow pr-8">{$LL.camera.editSpeaker()}</div>
                            <button
                                class="btn {!speakerEdit ? 'btn-secondary' : 'btn-light btn-ghost'}"
                                on:click|stopPropagation|preventDefault={() => (speakerEdit = !speakerEdit)}
                            >
                                {!speakerEdit ? $LL.actionbar.edit() : $LL.actionbar.cancel()}
                            </button>
                        </div>

                        <div class="flex items-center justify-center">
                            <div class="flex flex-wrap items-center justify-center min-h-[129px]">
                                {#each $speakerListStore as speaker, index (index)}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <div
                                        class="border border-solid min-w-[25em] rounded-lg relative items-center justify-start  m-2 space-x-4 transition-all overflow-hidden cursor-pointer px-8 py-6 {$speakerSelectedStore ===
                                        speaker.deviceId
                                            ? 'bg-white text-secondary border-none'
                                            : 'border-white hover:bg-white/10'}"
                                        class:flex={speakerEdit || $speakerSelectedStore === speaker.deviceId}
                                        class:hidden={!speakerEdit && $speakerSelectedStore !== speaker.deviceId}
                                        on:click={() => {
                                            selectSpeaker(speaker.deviceId);
                                            speakerEdit = false;
                                        }}
                                        on:click={playSoundClick}
                                    >
                                        <div
                                            class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center {$speakerSelectedStore ===
                                            speaker.deviceId
                                                ? 'bg-secondary border-secondary'
                                                : 'border-white'}"
                                        >
                                            {#if $speakerSelectedStore === speaker.deviceId}
                                                <CheckIcon width="w-4" height="h-4" />
                                            {/if}
                                        </div>
                                        <div class="space-y-1">
                                            <div
                                                class="text-lg bold max-w-[177px] truncate text-ellipsis overflow-hidden leading-tight"
                                            >
                                                {StringUtils.normalizeDeviceName(speaker.label)}
                                            </div>
                                            {#if speaker.deviceId === $speakerSelectedStore}
                                                <span class="chip chip-sm chip-neutral inline rounded-sm rounded-sm">
                                                    <span class="chip-label">{$LL.camera.active()}</span>
                                                </span>
                                            {:else}
                                                <span class="chip chip-sm chip-neutral inline rounded-sm">
                                                    <span class="chip-label">{$LL.camera.notRecommended()}</span>
                                                </span>
                                            {/if}
                                        </div>
                                        {#if speaker.deviceId === $speakerSelectedStore}
                                            <button class="btn btn-secondary" type="button">
                                                <!-- TODO HUGO -->
                                                <VolumeIcon />
                                            </button>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
            <div
                class="lg:fixed bottom-0 w-full bg-contrast/80 backdrop-blur-md border border-solid border-t border-b-0 border-x-0 border-white/10"
            >
                <section
                    class="container m-auto p-4 flex flex-col-reverse md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 justify-between"
                >
                    <button type="submit" class="btn btn-light btn-lg btn-ghost w-full md:w-1/2 block"
                        >{$LL.actionbar.cancel()}</button
                    >
                    <!-- TODO ACTION -->
                    <button type="submit" class="btn btn-secondary btn-lg w-full md:w-1/2 block"
                        >{$LL.menu.settings.save()}</button
                    >
                </section>
                {#if legalString}
                    <section class="terms-and-conditions h-fit z-40 text-center w-full">
                        <a style="display: none;" href="traduction">Need for traduction</a>
                        <p class="text-white text-xs italic opacity-50">
                            {@html $LL.login.terms({
                                links: legalString,
                            })}
                        </p>
                    </section>
                {/if}
            </div>
        </div>
    </section>
</form>
<div class="absolute left-0 top-0 w-screen h-screen bg-cover z-10" style="background-image: url('{bgMap}');" />
<div class="absolute left-0 top-0 w-screen h-screen bg-contrast/80 z-20" style="background-color: '{bgColor}';" />

<style lang="scss">
    .enableCameraScene {
        h2 {
            margin: 1px;
        }

        section.text-center {
            text-align: center;
        }
    }
</style>
