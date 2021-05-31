<script lang="typescript">
    import {Game} from "../../Phaser/Game/Game";
    import {LoginScene} from "../../Phaser/Login/LoginScene";
    import {DISPLAY_TERMS_OF_USE, MAX_USERNAME_LENGTH} from "../../Enum/EnvironmentVariable";
    import logoImg from "../images/logo.png";
    import {gameManager} from "../../Phaser/Game/GameManager";
    import {maxUserNameLength} from "../../Connexion/LocalUser";

    export let game: Game;

    const loginScene = game.scene.scenes.find((scene) => scene instanceof LoginScene);

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
    <input type="text" name="loginSceneName" class="nes-input is-dark" maxlength={MAX_USERNAME_LENGTH} bind:value={name} on:keypress={() => {startValidating = true}} class:is-error={name.trim() === '' && startValidating} />
    <section class="error-section">
    {#if name.trim() === '' && startValidating }
        <p class="err">The name is empty</p>
    {/if}
    </section>

    {#if !DISPLAY_TERMS_OF_USE}
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
    font-family: "Press Start 2P";
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

    section.error-section {
      min-height: 2rem;
      margin: 0;

      p {
        margin: 0;
      }
    }
  }

  .loginScene section {
    margin: 10px;
  }
  .loginScene section.action{
    text-align: center;
    margin-top: 20px;
  }
  .loginScene section h2{
    font-family: "Press Start 2P";
    margin: 1px;
  }
  .loginScene section.text-center{
    text-align: center;
  }
  .loginScene section a{
    text-decoration: underline;
    color: #ebeeee;
  }
  .loginScene section a:hover{
    font-weight: 700;
  }
  .loginScene section p{
    text-align: left;
    margin: 10px 10px;
  }
  .loginScene p.err{
    color: #ce372b;
    text-align: center;
  }
  /*.loginScene section p.info{
    display: none;
    text-align: center;
  }*/
  .loginScene section img{
    width: 100%;
    margin: 20px 0;
  }

</style>
