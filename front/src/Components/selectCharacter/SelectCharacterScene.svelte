<script lang="typescript">
    import type { Game } from "../../Phaser/Game/Game";
    import { SelectCharacterScene, SelectCharacterSceneName } from "../../Phaser/Login/SelectCharacterScene";
    import LL from "../../i18n/i18n-svelte";

    export let game: Game;

    const selectCharacterScene = game.scene.getScene(SelectCharacterSceneName) as SelectCharacterScene;

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
        <h2>{$LL.woka.selectWoka.title()}</h2>
        <button class="selectCharacterButton selectCharacterButtonLeft nes-btn" on:click|preventDefault={selectLeft}>
            &lt;
        </button>
        <button class="selectCharacterButton selectCharacterButtonRight nes-btn" on:click|preventDefault={selectRight}>
            &gt;
        </button>
    </section>
    <section class="action">
        <button
            type="submit"
            class="selectCharacterSceneFormSubmit nes-btn is-primary"
            on:click|preventDefault={cameraScene}>{$LL.woka.selectWoka.continue()}</button
        >
        <button
            type="submit"
            class="selectCharacterSceneFormCustomYourOwnSubmit nes-btn"
            on:click|preventDefault={customizeScene}>{$LL.woka.selectWoka.customize()}</button
        >
    </section>
</form>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

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

    @include media-breakpoint-up(md) {
        form.selectCharacterScene button.selectCharacterButtonLeft {
            left: 5vw;
        }
        form.selectCharacterScene button.selectCharacterButtonRight {
            right: 5vw;
        }
    }
</style>
