<script lang="typescript">
    import {Game} from "../../Phaser/Game/Game";
    import {EnableCameraSceneName} from "../../Phaser/Login/EnableCameraScene";
    import {
        audioConstraintStore,
        cameraListStore,
        localStreamStore,
        microphoneListStore,
        videoConstraintStore
    } from "../../Stores/MediaStore";
    import {onDestroy} from "svelte";
    import HorizontalSoundMeterWidget from "./HorizontalSoundMeterWidget.svelte";
    import cinemaCloseImg from "../images/cinema-close.svg";

    export let game: Game;
    let selectedCamera : string|null = null;
    let selectedMicrophone : string|null = null;

    const enableCameraScene = game.scene.getScene(EnableCameraSceneName);

    function submit() {
        enableCameraScene.login();
    }

    function srcObject(node, stream) {
        node.srcObject = stream;
        return {
            update(newStream) {
                if (node.srcObject != newStream) {
                    node.srcObject = newStream
                }
            }
        }
    }

    let stream: MediaStream | null;

    const unsubscribe = localStreamStore.subscribe(value => {
        if (value.type === 'success') {
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
            selectedCamera = null;
            selectedMicrophone = null;
        }
    });

    onDestroy(unsubscribe);

    function normalizeDeviceName(label: string): string {
        // remove text in parenthesis
        return label.replace(/\([^()]*\)/g, '').trim();
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
        <h2>Turn on your camera and microphone</h2>
    </section>
    <div id="webRtcSetup" class="webrtcsetup">
        <img class="background-img" src={cinemaCloseImg} alt="" class:hide={$localStreamStore.stream}>
        <video id="myCamVideoSetup" use:srcObject={$localStreamStore.stream} autoplay muted  class:hide={!$localStreamStore.stream}></video>
    </div>
    <HorizontalSoundMeterWidget stream={stream}></HorizontalSoundMeterWidget>

    <section class="selectWebcamForm">

        {#if $cameraListStore.length > 1 }
        <div class="nes-select">
            <select bind:value={selectedCamera} on:change={selectCamera}>
                {#each $cameraListStore as camera}
                    <option value={camera.deviceId}>
                        {normalizeDeviceName(camera.label)}
                    </option>
                {/each}
            </select>
        </div>
        {/if}

        {#if $microphoneListStore.length > 1 }
        <div class="nes-select">
            <select bind:value={selectedMicrophone} on:change={selectMicrophone}>
                {#each $microphoneListStore as microphone}
                    <option value={microphone.deviceId}>
                        {normalizeDeviceName(microphone.label)}
                    </option>
                {/each}
            </select>
        </div>
        {/if}

    </section>


    <!--<section class="text-center">
        <video id="myCamVideoSetup" autoplay muted></video>
    </section>
    <section class="text-center">
        <h5>Select your camera</h3>
        <select id="camera">
        </select>
    </section>
    <section class="text-center">
        <h5>Select your michrophone</h3>
        <select id="michrophone">
        </select>
    </section>-->
    <section class="action">
        <button type="submit" class="nes-btn is-primary letsgo" >Let's go!</button>
    </section>
</form>

<style lang="scss">
    .enableCameraScene {
      pointer-events: auto;
      /*background: #000000;*/
      margin: 20px auto 0;
      color: #ebeeee;
      height: 100vh;
      overflow: auto;
      /*max-height: 48vh;
      width: 42vw;
      max-width: 300px;*/

      /*section.title {
        position: absolute;
        top: 1vh;
        width: 100%;
      }*/

      section.selectWebcamForm {
        margin-top: 3vh;
        margin-bottom: 3vh;
        min-height: 10vh;
        width: 50%;
        margin-left: auto;
        margin-right: auto;

        select {
          font-family: "Press Start 2P";
          margin-top: 1vh;
          margin-bottom: 1vh;

          option {
            font-family: "Press Start 2P";
          }
        }
      }

      section.action{
        text-align: center;
        margin: 0;
        /*position: absolute;
        top: 85vh;*/
        width: 100%;
      }

      h2{
        font-family: "Press Start 2P";
        margin: 1px;
      }

      section.text-center{
        text-align: center;
      }

      button.letsgo {
        font-size: 200%;
      }

      .webrtcsetup{
        /*position: absolute;
        top: 140px;
        left: 0;
        right: 0;*/
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
          /*position: relative;*/
          /*display: block;*/
          width: 40%;
          /*height: 60%;*/
          /*top: 50%;*/
          /*transform: translateY(-50%);*/
        }

        .hide {
          display: none;
        }
      }
      #myCamVideoSetup {
          width: 100%;
          height: 100%;
          -webkit-transform: scaleX(-1);
          transform: scaleX(-1);
      }


    }
</style>

