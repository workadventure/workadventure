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
        requestedCameraState,
        requestedMicrophoneState,
    } from "../../Stores/MediaStore";
    import type { Game } from "../../Phaser/Game/Game";
    import cinemaCloseImg from "../images/no-video.svg";
    import cinemaImg from "../images/cinema.svg";
    import microphoneImg from "../images/microphone.svg";
    import { LL } from "../../../i18n/i18n-svelte";
    import { StringUtils } from "../../Utils/StringUtils";
    import { myCameraStore, myMicrophoneStore } from "../../Stores/MyMediaStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import HorizontalSoundMeterWidget from "./HorizontalSoundMeterWidget.svelte";

    export let game: Game;
    let selectedCamera: string | undefined = undefined;
    let selectedMicrophone: string | undefined = undefined;
    import bgMap from "../images/map-exemple.png";
    import {gameManager} from "../../Phaser/Game/GameManager";
    import CamOnIcon from "../Icons/CamOnIcon.svelte";
    import CamOffIcon from "../Icons/CamOffIcon.svelte";
    import MicOnIcon from "../Icons/MicOnIcon.svelte";
    import CheckIcon from "../Icons/CheckIcon.svelte";
    import MicOffIcon from "../Icons/MicOffIcon.svelte";

    const enableCameraScene = game.scene.getScene(EnableCameraSceneName) as EnableCameraScene;
    const bgColor = gameManager.currentStartedRoom.backgroundColor ?? "#1B2A41";

    let cameraEdit = false;
    let microphoneEdit = false;

    function submit() {
        selectCamera();
        selectMicrophone();
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

    let stream: MediaStream | null;

    const unsubscribeLocalStreamStore = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;

            if (stream !== null) {
                const videoTracks = stream.getVideoTracks();
                if (videoTracks.length > 0) {
                    selectedCamera = videoTracks[0].getSettings().deviceId;
                }
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    selectedMicrophone = audioTracks[0].getSettings().deviceId;
                }
            }
        } else {
            stream = null;
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
        requestedMicrophoneState.enableMicrophone();
        batchGetUserMediaStore.commitChanges();
    });

    function selectCamera(selectedCamera) {
        if (selectedCamera === undefined) {
            localUserStore.setPreferredVideoInputDevice("");
            requestedCameraState.disableWebcam();
            return;
        }
        requestedCameraState.enableWebcam();
        requestedCameraDeviceIdStore.set(selectedCamera);
        localUserStore.setPreferredVideoInputDevice(selectedCamera);
    }

    function selectMicrophone(selectedMicrophone) {
        if (selectedMicrophone === undefined) {
            localUserStore.setPreferredAudioInputDevice("");
            requestedMicrophoneState.disableMicrophone();
            return;
        }
        requestedMicrophoneState.enableMicrophone();
        requestedMicrophoneDeviceIdStore.set(selectedMicrophone);
        localUserStore.setPreferredAudioInputDevice(selectedMicrophone);
    }
</script>

<form class="enableCameraScene pointer-events-auto relative z-30 m-0" on:submit|preventDefault={submit}>
    <section class="flex items-center justify-center min-h-screen ">
        <div class="p-8 text-white container mx-auto flex flex-col items-center justify-center">
            <section class="mb-4 text-center">
                <h2 class="h4">{$LL.camera.enable.title()}</h2>
                <p class="opacity-50">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.<!-- Trad -->
                </p>
            </section>

            <div class="p-6 rounded-lg bg-white/10 mt-8">
                <div class="text-lg bold flex items-center justify-center space-x-3 w-[450px] mb-6">
                    <MicOnIcon height="h-8" width="w-8" />
                    <div class="grow">Your microphone <!-- Trad --></div>
                    <button class="btn {!microphoneEdit ? 'btn-secondary' : 'btn-light btn-ghost'}"
                            on:click|stopPropagation|preventDefault={() => (microphoneEdit = !microphoneEdit)}
                    >
                        {!microphoneEdit ? 'Edit mic' : 'Cancel'} <!-- Trad -->
                    </button>
                </div>

                <div class="flex ">
                    <div class="flex flex-wrap items-center justify-center">
                        <div class="border border-solid border-white rounded-lg pr-8 pl-6 pb-4 items-center justify-center space-x-4 transition-all cursor-pointer relative {selectedMicrophone === undefined ? 'bg-white text-secondary pt-12' : 'over:bg-white/10 pt-4'} {(microphoneEdit && selectedMicrophone !== undefined) || (!microphoneEdit && selectedMicrophone === undefined) ? 'flex' : 'hidden'}"
                             on:click={() => {
                        selectMicrophone(undefined);
                        microphoneEdit = false;
                    }}
                        >
                            <div class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center {selectedMicrophone === undefined ? 'bg-secondary border-secondary' : 'border-white'}">
                                {#if selectedMicrophone === undefined}
                                    <CheckIcon width="w-4" height="h-4" />
                                {/if}
                            </div>
                            <div class="space-y-1">
                                <div class="text-lg bold max-w-[200px] truncate text-ellipsis overflow-hidden leading-tight flex items-center">
                                    <MicOffIcon height="h-4" width="w-4" />
                                    {$LL.audio.disable()}
                                </div>
                                {#if selectedMicrophone === undefined}
                                    <span class="chip chip-sm chip-secondary !inline-block">
                                        <span class="chip-label">Active</span><!-- Trad -->
                                    </span>
                                {:else }
                                    <span class="chip chip-sm chip-neutral !inline-block">
                                        <span class="chip-label">Not recommended</span><!-- Trad -->
                                    </span>
                                {/if}
                            </div>
                        </div>
                        {#each $microphoneListStore ?? [] as microphone (microphone.deviceId)}
                            <div class="border border-solid border-white rounded-lg pr-8 pl-6 pb-4 items-center justify-center space-x-4 transition-all cursor-pointer relative {selectedMicrophone === microphone.deviceId ? 'bg-white text-secondary pt-12' : 'hover:bg-white/10 pt-4'} {(microphoneEdit && selectedMicrophone !== microphone.deviceId) || (!microphoneEdit && selectedMicrophone === microphone.deviceId) ? 'flex' : 'hidden'}"
                                 on:click={() => {
                                selectMicrophone(microphone.deviceId)
                                microphoneEdit = false;
                            }}
                            >
                                {#if microphone.deviceId === selectedMicrophone}
                                    <div class="absolute top-4 left-0 flex justify-center w-full">
                                        <HorizontalSoundMeterWidget spectrum={$localVolumeStore} />
                                    </div>
                                {/if}
                                <div class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center {selectedMicrophone === microphone.deviceId ? 'bg-secondary border-secondary' : 'border-white'}">
                                    {#if selectedMicrophone === microphone.deviceId}
                                        <CheckIcon width="w-4" height="h-4" />
                                    {/if}

                                </div>
                                <div class="space-y-1">
                                    <div class="text-lg bold max-w-[200px] truncate text-ellipsis overflow-hidden leading-tight">
                                        {StringUtils.normalizeDeviceName(microphone.label)}
                                    </div>
                                    {#if microphone.deviceId === selectedMicrophone}
                                    <span class="chip chip-sm chip-secondary !inline-block">
                                        <span class="chip-label">Active</span><!-- Trad -->
                                    </span>
                                    {:else }
                                    <span class="chip chip-sm chip-neutral !inline-block">
                                        <span class="chip-label">Inactive</span><!-- Trad -->
                                    </span>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <div class="p-6 rounded-lg bg-white/10 mt-8">
                <div class="text-lg bold flex items-center justify-center space-x-3 w-[450px] mb-6">
                    <CamOnIcon height="h-8" width="w-8" />
                    <div class="grow">Configure your camera <!-- Trad --></div>
                    <button class="btn {!cameraEdit ? 'btn-secondary' : 'btn-light btn-ghost'}"
                            on:click|stopPropagation|preventDefault={() => (cameraEdit = !cameraEdit)}
                    >
                        {!microphoneEdit ? 'Edit camera' : 'Cancel'}
                    </button>
                </div>

                <div class="flex justify-center">
                    <div class="flex items-center justify-center">
                        <div class="border border-solid border-white rounded-lg items-center justify-start space-x-4 transition-all cursor-pointer {selectedCamera === undefined ? 'bg-white/10' : 'hover:bg-white/10'} {(cameraEdit && selectedCamera !== undefined) || (!cameraEdit && selectedCamera === undefined) ? 'flex flex-col' : 'hidden'}"
                             on:click={() => {
                        selectCamera(undefined);
                        cameraEdit = false;
                    }}
                        >
                            {#if selectedCamera === undefined}
                                <div class="webrtcsetup flex items-center justify-center h-[200px] aspect-video rounded-lg overflow-hidden bg-contrast">
                                    <CamOffIcon />
                                </div>
                            {/if}
                            <div class="flex py-4 pr-8 pl-4 items-center space-x-4">
                                <div class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center">
                                    {#if selectedCamera === undefined}
                                        <CheckIcon width="w-4" height="h-4" />
                                    {/if}
                                </div>
                                <div class="space-y-1">
                                    <div class="text-lg bold max-w-[200px] truncate text-ellipsis overflow-hidden leading-tight">
                                        {$LL.camera.disable()}
                                    </div>
                                    {#if selectedCamera === undefined}
                                    <span class="chip chip-sm chip-secondary !inline-block">
                                        <span class="chip-label">Active</span><!-- Trad -->
                                    </span>
                                    {:else }
                                    <span class="chip chip-sm chip-neutral !inline-block">
                                        <span class="chip-label">Not recommended</span><!-- Trad -->
                                    </span>
                                    {/if}
                                </div>
                            </div>
                        </div>
                        {#each $cameraListStore ?? [] as camera (camera.deviceId)}
                            <div class="border border-solid border-white rounded-lg relative justify-start space-x-4 transition-all overflow-hidden cursor-pointer {selectedCamera === camera.deviceId ? 'bg-white text-secondary' : 'hover:bg-white/10'} {(cameraEdit && selectedCamera !== camera.deviceId) || (!cameraEdit && selectedCamera === camera.deviceId) ? 'flex flex-col' : 'hidden'}"
                                 on:click={() => {
                                selectCamera(camera.deviceId);
                                cameraEdit = false;
                            }}
                            >
                                {#if camera.deviceId === selectedCamera}
                                    {#if selectedCamera != undefined && $localStreamStore.type === "success" && $localStreamStore.stream}
                                        <video
                                                class="myCamVideoSetup flex items-center justify-center h-[200px] aspect-video overflow-hidden"
                                                use:srcObject={$localStreamStore.stream}
                                                autoplay
                                                muted
                                                playsinline
                                        ></video>
                                    {:else}
                                        <div class="webrtcsetup flex items-center justify-center w-full aspect-video rounded-lg overflow-hidden bg-contrast">
                                            CAM PB <!-- TODO : catch pb with cam -->
                                        </div>
                                    {/if}
                                {/if}
                                <div class="flex py-4 pr-8 pl-4 items-center space-x-4">
                                    <div class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center {selectedCamera === camera.deviceId ? 'bg-secondary border-secondary' : 'border-white'}">
                                        {#if selectedCamera === camera.deviceId}
                                            <CheckIcon width="w-4" height="h-4" />
                                        {/if}

                                    </div>
                                    <div class="space-y-1">
                                        <div class="text-lg bold max-w-[200px] truncate text-ellipsis overflow-hidden leading-tight">
                                            {StringUtils.normalizeDeviceName(camera.label)}
                                        </div>
                                        {#if camera.deviceId === selectedCamera}
                                    <span class="chip chip-sm chip-secondary !inline-block">
                                        <span class="chip-label">Active</span><!-- Trad -->
                                    </span>
                                        {:else }
                                    <span class="chip chip-sm chip-neutral !inline-block">
                                        <span class="chip-label">Inactive</span><!-- Trad -->
                                    </span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <section class="flex items-center space-x-4 justify-between border border-t border-white pt-8 min-w-[498px]">
                <button type="submit" class="btn btn-light btn-lg btn-ghost min-w-[200px] block">Cancel</button> <!-- Trad & TODO ACTION -->
                <button type="submit" class="btn btn-secondary btn-lg min-w-[200px] block">{$LL.camera.enable.start()}</button>
            </section>
        </div>
    </section>
</form>
<div class="absolute left-0 top-0 w-screen h-screen bg-cover z-10" style="background-image: url('{bgMap}');"></div>
<div class="absolute left-0 top-0 w-screen h-screen bg-contrast/80 z-20" style="background-color: '{bgColor}';"></div>
<style lang="scss">
    .enableCameraScene {

        section.selectWebcamForm {
            min-height: 10vh;
            width: 50vw;
            margin-left: auto;
            margin-right: auto;

            select {
                margin-top: 1vh;
                margin-bottom: 1vh;
            }
        }

        section.action {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            margin: 0;
            width: 100%;
        }

        h2 {
            margin: 1px;
        }

        section.text-center {
            text-align: center;
        }

        .control-group {
            display: flex;
            flex-direction: row;
            max-height: 60px;
            margin-top: 10px;

            img {
                width: 24px;
                margin-right: 10px;
            }
        }

        .webrtcsetup {
            img.background-img {
                width: 40%;
            }
        }
    }
</style>
