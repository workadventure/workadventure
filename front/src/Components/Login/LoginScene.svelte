<script lang="typescript">
    import type {Game} from "../../Phaser/Game/Game";
    import {LoginScene, LoginSceneName} from "../../Phaser/Login/LoginScene";
    import {DISPLAY_TERMS_OF_USE, MAX_USERNAME_LENGTH} from "../../Enum/EnvironmentVariable";
    import logoImg from "../images/logo.png";
    import {gameManager} from "../../Phaser/Game/GameManager";

    export let game: Game;

    const loginScene = game.scene.getScene(LoginSceneName) as LoginScene;

    let name = gameManager.getPlayerName() || '';
    let startValidating = false;

    function submit() {
        startValidating = true;

        let finalName = name.trim();
        if (finalName !== '') {
            loginScene.login(finalName);
        }
    }
</script>

<form class="loginScene" on:submit|preventDefault={submit}>
    <section class="text-center">
        <img src={logoImg} alt="WorkAdventure logo" />
    </section>
    <section class="text-center">
        <h2>Enter your name</h2>
    </section>
    <input type="text" name="loginSceneName" class="nes-input is-dark" autofocus maxlength={MAX_USERNAME_LENGTH} bind:value={name} on:keypress={() => {startValidating = true}} class:is-error={name.trim() === '' && startValidating} />
    <section class="error-section">
    {#if name.trim() === '' && startValidating }
        <p class="err">The name is empty</p>
    {/if}
    </section>

    {#if DISPLAY_TERMS_OF_USE}
    <section class="terms-and-conditions">
        <p>By continuing, you are agreeing our <a href="https://workadventu.re/terms-of-use" target="_blank">terms of use</a>, <a href="https://workadventu.re/privacy-policy" target="_blank">privacy policy</a> and <a href="https://workadventu.re/cookie-policy" target="_blank">cookie policy</a>.</p>
    </section>
    {/if}
    <section class="action">
        <button type="submit" class="nes-btn is-primary loginSceneFormSubmit">Continue</button>
    </section>
</form>

<style lang="scss">
  .loginScene {
    pointer-events: auto;
    margin: 20px auto 0;
    width: 90%;
    color: #ebeeee;

    display: flex;
    flex-flow: column wrap;
    align-items: center;

    input {
      text-align: center;
      font-family: "Press Start 2P";
      max-width: 400px;
    }

    .terms-and-conditions {
      max-width: 400px;
    }

    p.err {
      color: #ce372b;
      text-align: center;
    }

    section {
      margin: 10px;

      &.error-section {
        min-height: 2rem;
        margin: 0;

        p {
          margin: 0;
        }
      }

      &.action {
        text-align: center;
        margin-top: 20px;
      }

      h2 {
        font-family: "Press Start 2P";
        margin: 1px;
      }

      &.text-center {
        text-align: center;
      }

      a {
        text-decoration: underline;
        color: #ebeeee;
      }

      a:hover {
        font-weight: 700;
      }

      p {
        text-align: left;
        margin: 10px 10px;
      }

      img {
        width: 100%;
        margin: 20px 0;
      }
    }
  }

</style>
