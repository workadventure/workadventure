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

    const enableCameraScene = game.scene.getScene(EnableCameraSceneName) as EnableCameraScene;
    const bgColor = gameManager.currentStartedRoom.backgroundColor ?? "#1B2A41";

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

    function selectCamera() {
        if (selectedCamera === undefined) {
            localUserStore.setPreferredVideoInputDevice("");
            requestedCameraState.disableWebcam();
            return;
        }
        requestedCameraState.enableWebcam();
        requestedCameraDeviceIdStore.set(selectedCamera);
        localUserStore.setPreferredVideoInputDevice(selectedCamera);
    }

    function selectMicrophone() {
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

<form class="enableCameraScene pointer-events-auto relative z-30" on:submit|preventDefault={submit}>
    <section class="px-10 md:px-32">
        <div class="p-8">
            <section class="text-center mb-4">
                <h2>{$LL.camera.enable.title()}</h2>
            </section>
            {#if selectedCamera != undefined && $localStreamStore.type === "success" && $localStreamStore.stream}
                <video
                    class="myCamVideoSetup mb-26"
                    use:srcObject={$localStreamStore.stream}
                    autoplay
                    muted
                    playsinline
                ></video>
            {:else}
                <div class="webrtcsetup flex items-center justify-center h-56 aspect-video">
                    <img class="background-img" src={cinemaCloseImg} alt="" />
                </div>
            {/if}
            {#if selectedMicrophone != undefined}
                {selectedMicrophone}
                <div class="w-full flex flex-col flex-wrap content-center mt-6">
                    <HorizontalSoundMeterWidget spectrum={$localVolumeStore} />
                </div>
            {/if}

            <section class="selectWebcamForm flex flex-col justify-center items-center content-center m-2">
                <div class="control-group">
                    <img src={cinemaImg} alt="Camera" />
                    <div class="is-dark">
                        <select bind:value={selectedCamera} on:change={selectCamera} class="w-52 md:w-96 text-white bg-contrast rounded border border-solid border-white/20 mt-4 mb-0">
                            <!-- start with camera off -->
                            <option value={undefined}>{$LL.camera.disable()}</option>

                            {#each $cameraListStore ?? [] as camera (camera.deviceId)}
                                <option value={camera.deviceId}>
                                    {StringUtils.normalizeDeviceName(camera.label)}
                                </option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="control-group">
                    <img src={microphoneImg} alt="Microphone" />
                    <div class="is-dark">
                        <select bind:value={selectedMicrophone} on:change={selectMicrophone} class="w-52 md:w-96 text-white bg-contrast rounded border border-solid border-white/20 mt-4 mb-0">
                            <!-- start with microphone off -->
                            <option value={undefined}>{$LL.audio.disable()}</option>

                            {#each $microphoneListStore ?? [] as microphone (microphone.deviceId)}
                                <option value={microphone.deviceId}>
                                    {StringUtils.normalizeDeviceName(microphone.label)}
                                </option>
                            {/each}
                        </select>
                    </div>
                </div>
            </section>
            <section class="action fixed bottom-2 h-auto w-full left-0">
                <button type="submit" class="light">{$LL.camera.enable.start()}</button>
            </section>
        </div>
    </section>
</form>
<div in:fade={{ duration: 100 }}
     class="absolute left-0 top-0 w-screen h-screen bg-cover z-10" style="background-image: url('{bgMap}');"></div>
<div
        class="absolute left-0 top-0 w-screen h-screen z-20" style="background-color: '{bgColor}';"></div>
<style lang="scss">
    .enableCameraScene {
        pointer-events: auto;
        margin: 20px auto 0;
        color: #ebeeee;

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
        .myCamVideoSetup {
            margin-top: 2vh;
            margin-left: auto;
            margin-right: auto;
            max-height: 28vh;
            width: 100%;
            transform: scaleX(-1);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.5rem;
        }
    }
</style>
