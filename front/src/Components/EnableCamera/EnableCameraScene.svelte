<script lang="typescript">
    import {Game} from "../../Phaser/Game/Game";
    import {EnableCameraSceneName} from "../../Phaser/Login/EnableCameraScene";
    import {localStreamStore} from "../../Stores/MediaStore";
    import {onDestroy} from "svelte";

    export let game: Game;

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

    let stream : MediaStream|null;

    const unsubscribe = localStreamStore.subscribe(value => {
        if (value.type === 'success') {
            stream = value.stream;
        } else {
            stream = null;
        }
    });

    onDestroy(unsubscribe);

</script>

<form class="enableCameraScene" on:submit|preventDefault={submit}>
    <section class="title text-center">
        <h2>Turn on your camera and microphone</h2>
    </section>
    <div id="webRtcSetup" class="webrtcsetup">
        <img class="background-img" src="resources/logos/cinema-close.svg" alt="" class:hide={$localStreamStore.stream}>
        <video id="myCamVideoSetup" use:srcObject={$localStreamStore.stream} autoplay muted></video>
    </div>

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
      /*max-height: 48vh;
      width: 42vw;
      max-width: 300px;*/
      overflow: hidden;

      section.title {
        position: absolute;
        top: 1vh;
        width: 100%;
      }

      section.action{
        text-align: center;
        margin: 0;
        position: absolute;
        top: 85vh;
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
        position: absolute;
        top: 140px;
        left: 0;
        right: 0;

        margin-left: auto;
        margin-right: auto;
        height: 50%;
        width: 50%;
        border: white 6px solid;

        img.background-img {
          position: relative;
          display: block;
          width: 40%;
          height: 60%;
          margin-left: auto;
          margin-right: auto;
          top: 50%;
          transform: translateY(-50%);
        }

        img.hide {
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

