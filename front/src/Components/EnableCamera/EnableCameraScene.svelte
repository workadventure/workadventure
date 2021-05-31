<script lang="typescript">
    import {Game} from "../../Phaser/Game/Game";
    import {EnableCameraScene} from "../../Phaser/Login/EnableCameraScene";

    export let game: Game;

    const enableCameraScene = game.scene.scenes.find((scene) => scene instanceof EnableCameraScene);

    function submit() {
        enableCameraScene.login();
    }

</script>

<form class="enableCameraScene" on:submit|preventDefault={submit}>
    <section class="title text-center">
        <h2>Turn on your camera and microphone</h2>
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
    }
</style>

