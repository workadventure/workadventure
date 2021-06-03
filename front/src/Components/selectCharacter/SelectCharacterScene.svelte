<script lang="typescript">
    import { Game } from "../../Phaser/Game/Game";
    import { SelectCharacterSceneName } from "../../Phaser/Login/SelectCharacterScene";

    export let game: Game;

    const selectCharacterScene = game.scene.getScene(SelectCharacterSceneName);

    function selectLeft() {
        selectCharacterScene.moveToLeft();
    }

    function selectRight() {
        selectCharacterScene.moveToRight();
    }

    function cameraScene() {
        selectCharacterScene.nextSceneToCameraScene();
    }

    function customizeScene() {
        selectCharacterScene.nextSceneToCustomizeScene();
    }

</script>

<form class="selectCharacterScene">
    <section class="text-center">
        <h2>Select your WOKA</h2>
        <button class="selectCharacterButton selectCharacterButtonLeft nes-btn" on:click|preventDefault={ selectLeft }> &lt; </button>
        <button class="selectCharacterButton selectCharacterButtonRight nes-btn" on:click|preventDefault={ selectRight }> &gt; </button>
    </section>
    <section class="action">
        <button type="submit" class="selectCharacterSceneFormSubmit nes-btn is-primary" on:click|preventDefault={ cameraScene }>Continue</button>
        <button type="submit" class="selectCharacterSceneFormCustomYourOwnSubmit nes-btn" on:click|preventDefault={ customizeScene }>Customize your WOKA</button>
    </section>
</form>

<style lang="scss">
  form.selectCharacterScene {
    font-family: "Press Start 2P";
    pointer-events: auto;
    color: #ebeeee;

    section {
      margin: 10px;

      &.action {
        text-align: center;
        margin-top: 55vh;
      }

      h2 {
        font-family: "Press Start 2P";
        margin: 1px;
      }

      &.text-center {
        text-align: center;
      }

      button.selectCharacterButton {
        position: absolute;
        top: 33vh;
        margin: 0;
      }
    }

    button {
      font-family: "Press Start 2P";

      &.selectCharacterButtonLeft {
        left: 33vw;
      }

      &.selectCharacterButtonRight {
        right: 33vw;
      }
    }
  }

  @media only screen and (max-width: 800px) {
    form.selectCharacterScene button.selectCharacterButtonLeft{
      left: 5vw;
    }
    form.selectCharacterScene button.selectCharacterButtonRight{
      right: 5vw;
    }
  }


</style>