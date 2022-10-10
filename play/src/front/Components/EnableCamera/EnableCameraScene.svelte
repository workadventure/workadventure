<script lang="ts">
    import type { Game } from "../../Phaser/Game/Game";
    import { EnableCameraScene, EnableCameraSceneName } from "../../Phaser/Login/EnableCameraScene";
    import {
        audioConstraintStore,
        cameraListStore,
        localStreamStore,
        localVolumeStore,
        microphoneListStore,
        requestedCameraState,
        requestedMicrophoneState,
        videoConstraintStore,
    } from "../../Stores/MediaStore";
    import { onDestroy, onMount } from "svelte";
    import HorizontalSoundMeterWidget from "./HorizontalSoundMeterWidget.svelte";
    import cinemaCloseImg from "../images/cinema-close.svg";
    import cinemaImg from "../images/cinema.svg";
    import microphoneImg from "../images/microphone.svg";
    import LL from "../../../i18n/i18n-svelte";
    import { StringUtils } from "../../Utils/StringUtils";
    import { myCameraStore, myMicrophoneStore } from "../../Stores/MyMediaStore";

    export let game: Game;
    let selectedCamera: string | undefined = undefined;
    let selectedMicrophone: string | undefined = undefined;

    const enableCameraScene = game.scene.getScene(EnableCameraSceneName) as EnableCameraScene;

    function submit() {
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
        //init the componenent to enable webcam and microphone
        myCameraStore.set(true);
        myMicrophoneStore.set(true);
        requestedCameraState.enableWebcam();
        requestedMicrophoneState.enableMicrophone();
    });

    function selectCamera() {
        if (selectedCamera === null) {
            requestedCameraState.disableWebcam();
            return;
        }
        requestedCameraState.enableWebcam();
        videoConstraintStore.setDeviceId(selectedCamera);
    }

    function selectMicrophone() {
        if (selectedMicrophone === null) {
            requestedMicrophoneState.disableMicrophone();
            return;
        }
        requestedMicrophoneState.enableMicrophone();
        audioConstraintStore.setDeviceId(selectedMicrophone);
    }
</script>

<form class="enableCameraScene" on:submit|preventDefault={submit}>
    <section class="text-center">
        <h2>{$LL.camera.enable.title()}</h2>
    </section>
    {#if selectedCamera != undefined && $localStreamStore.type === "success" && $localStreamStore.stream}
        <video class="myCamVideoSetup" use:srcObject={$localStreamStore.stream} autoplay muted playsinline />
    {:else}
        <div class="webrtcsetup">
            <img class="background-img" src={cinemaCloseImg} alt="" />
        </div>
    {/if}
    {#if selectedMicrophone != undefined}
        <HorizontalSoundMeterWidget volume={$localVolumeStore} />
    {/if}

    <section class="selectWebcamForm">
        <div class="control-group">
            <img src={cinemaImg} alt="Camera" />
            <div class="is-dark">
                <!-- svelte-ignore a11y-no-onchange -->
                <select bind:value={selectedCamera} on:change={selectCamera}>
                    <!-- start with camera off -->
                    <option value={null}>{$LL.camera.disable()}</option>

                    {#each $cameraListStore as camera}
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
                <!-- svelte-ignore a11y-no-onchange -->
                <select bind:value={selectedMicrophone} on:change={selectMicrophone}>
                    <!-- start with microphone off -->
                    <option value={null}>{$LL.audio.disable()}</option>

                    {#each $microphoneListStore as microphone}
                        <option value={microphone.deviceId}>
                            {StringUtils.normalizeDeviceName(microphone.label)}
                        </option>
                    {/each}
                </select>
            </div>
        </div>
    </section>
    <section class="action">
        <button type="submit" class="light">{$LL.camera.enable.start()}</button>
    </section>
</form>

<style lang="scss">
    .enableCameraScene {
        pointer-events: auto;
        margin: 20px auto 0;
        color: #ebeeee;

        section.selectWebcamForm {
            margin-top: 3vh;
            margin-bottom: 3vh;
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
                width: 30px;
                margin-right: 10px;
            }
        }

        .webrtcsetup {
            margin-top: 2vh;
            margin-left: auto;
            margin-right: auto;
            height: 28.125vw;
            width: 50vw;
            border: white 6px solid;

            display: flex;
            align-items: center;
            justify-content: center;

            img.background-img {
                width: 40%;
            }
        }
        .myCamVideoSetup {
            margin-top: 2vh;
            margin-left: auto;
            margin-right: auto;
            max-height: 28vh;
            width: auto;
            transform: scaleX(-1);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.5rem;
        }
    }
</style>
