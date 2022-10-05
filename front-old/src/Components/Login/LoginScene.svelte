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

<form class="loginScene" on:submit|preventDefault={submit}>
    <section class="text-center">
        <img src={logo} alt="logo" class="main-logo" />
    </section>
    <section class="text-center">
        <h2>{$LL.login.input.name.placeholder()}</h2>
    </section>
    <!-- svelte-ignore a11y-autofocus -->
    <input
        type="text"
        name="loginSceneName"
        class="nes-input is-dark"
        autofocus
        maxlength={MAX_USERNAME_LENGTH}
        bind:value={name}
        on:keypress={() => {
            startValidating = true;
        }}
        class:is-error={(name.trim() === "" && startValidating) || errorName !== ""}
    />
    <section class="error-section">
        {#if (name.trim() === "" && startValidating) || errorName !== ""}
            <p class="err">
                {#if errorName}{errorName}{:else}{$LL.login.input.name.empty()}{/if}
            </p>
        {/if}
    </section>

    {#if DISPLAY_TERMS_OF_USE}
        <section class="terms-and-conditions">
            <a style="display: none;" href="traduction">Need for traduction</a>
            <p>
                {@html $LL.login.terms()}
            </p>
        </section>
    {/if}
    <section class="action">
        <button type="submit" class="nes-btn is-primary loginSceneFormSubmit">{$LL.login.continue()}</button>
    </section>
    {#if logo !== logoImg && gameManager.currentStartedRoom.showPoweredBy !== false}
        <section class="text-right powered-by">
            <img src={poweredByWorkAdventureImg} alt="Powered by WorkAdventure" />
        </section>
    {/if}
</form>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

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
            font-size: 0.875rem;
        }

        p.err {
            color: #ce372b;
            text-align: center;
        }

        section {
            margin: 5px;

            &.error-section {
                min-height: 2rem;
                margin: 0;

                p {
                    margin: 0;
                }
            }

            &.action {
                text-align: center;
            }

            h2 {
                font-family: "Press Start 2P";
                font-size: 0.75rem;
                margin: 0.5rem;
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
            }

            &.powered-by {
                position: fixed;
                bottom: 0;
                right: 10px;
                max-height: 5rem;
                img {
                    height: 2rem;
                }
            }

            .main-logo {
                max-height: 4rem;
            }
        }
    }

    @include media-breakpoint-down(sm) {
        .loginScene {
            .terms-and-conditions {
                font-size: 1rem;
            }
            section {
                margin: 5px;

                img {
                    margin: 10px 0;
                }

                h2 {
                    font-size: 1.5rem;
                }

                .main-logo {
                    max-height: 10rem;
                }

                &.action {
                    margin-top: 10px;
                }

                &.powered-by {
                    max-height: 8rem;
                    img {
                        height: 3rem;
                    }
                }
            }
        }
    }
</style>
