<script lang="typescript">
    import {Game} from "../../Phaser/Game/Game";
    import {SelectCompanionScene} from "../../Phaser/Login/SelectCompanionScene";

    export let game: Game;

    const selectCompanionScene = game.scene.scenes.find((scene) => scene instanceof SelectCompanionScene);

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
  }
  .selectCompanionScene button {
    font-family: "Press Start 2P";
  }
  .selectCompanionScene section {
    margin: 10px;
  }
  .selectCompanionScene section.action {
    text-align: center;
    margin-top: 55vh;
  }
  .selectCompanionScene section h2 {
    font-family: "Press Start 2P";
    margin: 1px;
  }
  .selectCompanionScene section.text-center{
    text-align: center;
  }
  .selectCompanionScene section button.selectCharacterButton{
    position: absolute;
    top: 33vh;
    margin: 0;
  }
  .selectCompanionScene button.selectCharacterButtonLeft{
    left: 33vw;
  }
  .selectCompanionScene button.selectCharacterButtonRight{
    right: 33vw;
  }

  @media only screen and (max-width: 800px) {
    .selectCompanionScene button.selectCharacterButtonLeft{
      left: 10vw;
    }
    .selectCompanionScene button.selectCharacterButtonRight{
      right: 10vw;
    }
  }


</style>