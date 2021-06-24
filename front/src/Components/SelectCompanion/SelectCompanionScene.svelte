<script lang="typescript">
    import type {Game} from "../../Phaser/Game/Game";
    import {SelectCompanionScene, SelectCompanionSceneName} from "../../Phaser/Login/SelectCompanionScene";

    export let game: Game;

    const selectCompanionScene = game.scene.getScene(SelectCompanionSceneName) as SelectCompanionScene;

    function selectLeft() {
        selectCompanionScene.moveToLeft();
    }

    function selectRight() {
        selectCompanionScene.moveToRight();
    }

    function noCompanion() {
        selectCompanionScene.closeScene();
    }

    function selectCompanion() {
        selectCompanionScene.selectCompanion();
    }
</script>

<form class="selectCompanionScene">
    <section class="text-center">
        <h2>Select your companion</h2>
        <button class="selectCharacterButton selectCharacterButtonLeft nes-btn" on:click|preventDefault={selectLeft}> &lt; </button>
        <button class="selectCharacterButton selectCharacterButtonRight nes-btn" on:click|preventDefault={selectRight}> &gt; </button>
    </section>
    <section class="action">
        <button href="/" class="selectCompanionSceneFormBack nes-btn" on:click|preventDefault={noCompanion}>No companion</button>
        <button type="submit" class="selectCompanionSceneFormSubmit nes-btn is-primary" on:click|preventDefault={selectCompanion}>Continue</button>
    </section>
</form>

<style lang="scss">
  form.selectCompanionScene {
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

    button.selectCharacterButtonLeft {
      left: 33vw;
    }

    button.selectCharacterButtonRight {
      right: 33vw;
    }
  }

  @media only screen and (max-width: 800px) {
    form.selectCompanionScene button.selectCharacterButtonLeft{
      left: 5vw;
    }
    form.selectCompanionScene button.selectCharacterButtonRight{
      right: 5vw;
    }
  }


</style>
