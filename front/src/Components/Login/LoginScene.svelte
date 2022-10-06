<script lang="ts">
    import type { Game } from "../../Phaser/Game/Game";
    import { LoginScene, LoginSceneName } from "../../Phaser/Login/LoginScene";
    import { DISPLAY_TERMS_OF_USE, MAX_USERNAME_LENGTH } from "../../Enum/EnvironmentVariable";
    import logoImg from "../images/logo.png";
    import poweredByWorkAdventureImg from "../images/Powered_By_WorkAdventure_Big.png";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../i18n/i18n-svelte";
    import { NameNotValidError, NameTooLongError } from "../../Exception/NameError";

    export let game: Game;

    const loginScene = game.scene.getScene(LoginSceneName) as LoginScene;

    let name = gameManager.getPlayerName() || "";
    let startValidating = false;
    let errorName = "";

    let logo = gameManager.currentStartedRoom?.loginSceneLogo ?? logoImg;

    function submit() {
        startValidating = true;

        let finalName = name.trim();
        if (finalName !== "") {
            try {
                loginScene.login(finalName);
            } catch (err) {
                if (err instanceof NameTooLongError) {
                    errorName = $LL.login.input.name.tooLongError();
                } else if (err instanceof NameNotValidError) {
                    errorName = $LL.login.input.name.notValidError();
                } else {
                    throw err;
                }
            }
        }
    }
</script>

<form
    class="loginScene tw-w-screen tw-bg-dark-blue/75 tw-flex tw-flex-col tw-h-screen tw-px-10 md:tw-px-32 tw-pointer-events-auto tw-pt-20"
    on:submit|preventDefault={submit}
>
    <section class="tw-h-fit tw-max-w-2xl tw-self-center">
        <img src={logo} alt="logo" class="main-logo tw-w-full" />
    </section>
    <div class="tw-bg-dark-purple tw-w-full sm:tw-w-96 tw-rounded tw-mx-auto tw-text-center">
        <section class="text-center tw-flex tw-h-fit tw-flex-col">
            <h2 class="tw-text-light-blue">{$LL.login.input.name.placeholder()}</h2>
            <input
                type="text"
                name="loginSceneName"
                class=""
                autofocus
                maxlength={MAX_USERNAME_LENGTH}
                bind:value={name}
                on:keypress={() => {
                    startValidating = true;
                }}
                class:is-error={(name.trim() === "" && startValidating) || errorName !== ""}
            />
            {#if (name.trim() === "" && startValidating) || errorName !== ""}
                <p class="err tw-text-pop-red tw-text-sm">
                    {#if errorName}{errorName}{:else}{$LL.login.input.name.empty()}{/if}
                </p>
            {/if}
        </section>

        <!-- svelte-ignore a11y-autofocus -->

        {#if DISPLAY_TERMS_OF_USE}
            <section class="terms-and-conditions tw-flex tw-h-fit">
                <a style="display: none;" href="traduction">Need for traduction</a>
                <p class="tw-text-white">
                    {@html $LL.login.terms()}
                </p>
            </section>
        {/if}
        <section class="action tw-flex tw-h-fit tw-justify-center">
            <button type="submit" class="light loginSceneFormSubmit">{$LL.login.continue()}</button>
        </section>
    </div>
    {#if true}
        <section class="text-right tw-flex powered-by tw-justify-center">
            <img src={poweredByWorkAdventureImg} alt="Powered by WorkAdventure" class="tw-h-14" />
        </section>
    {/if}
</form>
