<script lang="typescript">
    import { Game } from "../../Phaser/Game/Game";
    import { CustomizeSceneName } from "../../Phaser/Login/CustomizeScene";

    export let game: Game;

    const customCharacterScene = game.scene.getScene(CustomizeSceneName);
    let activeRow = customCharacterScene.activeRow;

    function selectLeft() {
        customCharacterScene.moveCursorHorizontally(-1);
    }

    function selectRight() {
        customCharacterScene.moveCursorHorizontally(1);
    }

    function selectUp() {
        customCharacterScene.moveCursorVertically(-1);
        activeRow = customCharacterScene.activeRow;
    }

    function selectDown() {
        customCharacterScene.moveCursorVertically(1);
        activeRow = customCharacterScene.activeRow;
    }

    function previousScene() {
        customCharacterScene.backToPreviousScene();
    }

    function finish() {
        customCharacterScene.nextSceneToCamera();
    }

</script>

<form class="customCharacterScene">
    <section class="text-center">
        <h2>Customize your WOKA</h2>
    </section>
    <section class="action action-move">
        <button class="customCharacterSceneButton customCharacterSceneButtonLeft nes-btn" on:click|preventDefault={ selectLeft }> &lt; </button>
        <button class="customCharacterSceneButton customCharacterSceneButtonRight nes-btn" on:click|preventDefault={ selectRight }> &gt; </button>
    </section>
    <section class="action">
        {#if activeRow === 0}
            <button type="submit" class="customCharacterSceneFormBack nes-btn" on:click|preventDefault={ previousScene }>Return</button>
        {/if}
        {#if activeRow !== 0}
            <button type="submit" class="customCharacterSceneFormBack nes-btn" on:click|preventDefault={ selectUp }>Back <img src="resources/objects/arrow_up_black.png" alt=""/></button>
        {/if}
        {#if activeRow === 5}
            <button type="submit" class="customCharacterSceneFormSubmit nes-btn is-primary" on:click|preventDefault={ finish }>Finish</button>
        {/if}
        {#if activeRow !== 5}
            <button type="submit" class="customCharacterSceneFormSubmit nes-btn is-primary" on:click|preventDefault={ selectDown }>Next <img src="resources/objects/arrow_down.png" alt=""/></button>
        {/if}
    </section>
</form>

<style lang="scss">
  form.customCharacterScene {
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

      button.customCharacterSceneButton {
        position: absolute;
        top: 33vh;
        margin: 0;
      }

      button.customCharacterSceneFormBack {
        color: #292929;
      }
    }

    button {
      font-family: "Press Start 2P";

      &.customCharacterSceneButtonLeft {
        left: 33vw;
      }

      &.customCharacterSceneButtonRight {
        right: 33vw;
      }
    }
  }

  @media only screen and (max-width: 800px) {
    form.customCharacterScene button.customCharacterSceneButtonLeft{
      left: 5vw;
    }
    form.customCharacterScene button.customCharacterSceneButtonRight{
      right: 5vw;
    }
  }


</style>