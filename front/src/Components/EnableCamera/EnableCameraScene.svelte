<script lang="typescript">
    import type { Game } from "../../Phaser/Game/Game";
    import { EnableCameraScene, EnableCameraSceneName } from "../../Phaser/Login/EnableCameraScene";
    import {
        audioConstraintStore,
        cameraListStore,
        localStreamStore,
        microphoneListStore,
        videoConstraintStore,
    } from "../../Stores/MediaStore";
    import { onDestroy } from "svelte";
    import HorizontalSoundMeterWidget from "./HorizontalSoundMeterWidget.svelte";
    import cinemaCloseImg from "../images/cinema-close.svg";
    import cinemaImg from "../images/cinema.svg";
    import microphoneImg from "../images/microphone.svg";
    import LL from "../../i18n/i18n-svelte";

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

    const unsubscribe = localStreamStore.subscribe((value) => {
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

    onDestroy(unsubscribe);

    function normalizeDeviceName(label: string): string {
        // remove IDs (that can appear in Chrome, like: "HD Pro Webcam (4df7:4eda)"
        return label.replace(/(\([[0-9a-f]{4}:[0-9a-f]{4}\))/g, "").trim();
    }

    function selectCamera() {
        videoConstraintStore.setDeviceId(selectedCamera);
    }

    function selectMicrophone() {
        audioConstraintStore.setDeviceId(selectedMicrophone);
    }
</script>

<form class="enableCameraScene" on:submit|preventDefault={submit}>
    <section class="text-center">
        <h2>{$LL.camera.enable.title()}</h2>
    </section>
    {#if $localStreamStore.type === "success" && $localStreamStore.stream}
        <video class="myCamVideoSetup" use:srcObject={$localStreamStore.stream} autoplay muted playsinline />
    {:else}
        <div class="webrtcsetup">
            <img class="background-img" src={cinemaCloseImg} alt="" />
        </div>
    {/if}
    <HorizontalSoundMeterWidget {stream} />

    <section class="selectWebcamForm">
        {#if $cameraListStore.length > 1}
            <div class="control-group">
                <img src={cinemaImg} alt="Camera" />
                <div class="nes-select is-dark">
                    <!-- svelte-ignore a11y-no-onchange -->
                    <select bind:value={selectedCamera} on:change={selectCamera}>
                        {#each $cameraListStore as camera}
                            <option value={camera.deviceId}>
                                {normalizeDeviceName(camera.label)}
                            </option>
                        {/each}
                    </select>
                </div>
            </div>
        {/if}

        {#if $microphoneListStore.length > 1}
            <div class="control-group">
                <img src={microphoneImg} alt="Microphone" />
                <div class="nes-select is-dark">
                    <!-- svelte-ignore a11y-no-onchange -->
                    <select bind:value={selectedMicrophone} on:change={selectMicrophone}>
                        {#each $microphoneListStore as microphone}
                            <option value={microphone.deviceId}>
                                {normalizeDeviceName(microphone.label)}
                            </option>
                        {/each}
                    </select>
                </div>
            </div>
        {/if}
    </section>
    <section class="action">
        <button type="submit" class="nes-btn is-primary letsgo">{$LL.camera.enable.start()}</button>
    </section>
</form>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

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
                font-family: "Press Start 2P";
                margin-top: 1vh;
                margin-bottom: 1vh;
            }

            option {
                font-family: "Press Start 2P";
            }
        }

        section.action {
            text-align: center;
            margin: 0;
            width: 100%;
        }

        h2 {
            font-family: "Press Start 2P";
            margin: 1px;
        }

        section.text-center {
            text-align: center;
        }

        button.letsgo {
            font-size: 200%;
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
            max-height: 50vh;
            width: 50vw;
            border: white 6px solid;
            -webkit-transform: scaleX(-1);
            transform: scaleX(-1);

            display: flex;
            align-items: center;
            justify-content: center;
        }
    }

    @include media-breakpoint-up(md) {
        .enableCameraScene h2 {
            font-size: 80%;
        }
        .enableCameraScene .control-group .nes-select {
            font-size: 80%;
        }
        .enableCameraScene button.letsgo {
            font-size: 160%;
        }
    }
</style>
