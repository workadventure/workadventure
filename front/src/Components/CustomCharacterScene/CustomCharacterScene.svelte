<script lang="typescript">
    import type { Game } from "../../Phaser/Game/Game";
    import { CustomizeScene, CustomizeSceneName } from "../../Phaser/Login/CustomizeScene";
    import { activeRowStore } from "../../Stores/CustomCharacterStore";
    import LL from "../../i18n/i18n-svelte";

    export let game: Game;

    const customCharacterScene = game.scene.getScene(CustomizeSceneName) as CustomizeScene;

    function selectLeft() {
        customCharacterScene.moveCursorHorizontally(-1);
    }

    function selectRight() {
        customCharacterScene.moveCursorHorizontally(1);
    }

    function selectUp() {
        customCharacterScene.moveCursorVertically(-1);
    }

    function selectDown() {
        customCharacterScene.moveCursorVertically(1);
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
        <h2>{$LL.woka.customWoka.title()}</h2>
    </section>
    <section class="action action-move">
        <button
            class="customCharacterSceneButton customCharacterSceneButtonLeft nes-btn"
            on:click|preventDefault={selectLeft}
        >
            &lt;
        </button>
        <button
            class="customCharacterSceneButton customCharacterSceneButtonRight nes-btn"
            on:click|preventDefault={selectRight}
        >
            &gt;
        </button>
    </section>
    <section class="action">
        {#if $activeRowStore === 0}
            <button type="submit" class="customCharacterSceneFormBack nes-btn" on:click|preventDefault={previousScene}
                >{$LL.woka.customWoka.navigation.return()}</button
            >
        {/if}
        {#if $activeRowStore !== 0}
            <button type="submit" class="customCharacterSceneFormBack nes-btn" on:click|preventDefault={selectUp}
                >{$LL.woka.customWoka.navigation.back()}
                <img src="resources/objects/arrow_up_black.png" alt="" /></button
            >
        {/if}
        {#if $activeRowStore === 5}
            <button
                type="submit"
                class="customCharacterSceneFormSubmit nes-btn is-primary"
                on:click|preventDefault={finish}>{$LL.woka.customWoka.navigation.finish()}</button
            >
        {/if}
        {#if $activeRowStore !== 5}
            <button
                type="submit"
                class="customCharacterSceneFormSubmit nes-btn is-primary"
                on:click|preventDefault={selectDown}
                >{$LL.woka.customWoka.navigation.next()}
                <img src="resources/objects/arrow_down.png" alt="" /></button
            >
        {/if}
    </section>
</form>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

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

    @include media-breakpoint-up(md) {
        form.customCharacterScene button.customCharacterSceneButtonLeft {
            left: 5vw;
        }
        form.customCharacterScene button.customCharacterSceneButtonRight {
            right: 5vw;
        }
    }
</style>
