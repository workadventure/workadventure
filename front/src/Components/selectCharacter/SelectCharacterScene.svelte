<script lang="ts">
    import type { Game } from "../../Phaser/Game/Game";
    import { SelectCharacterScene, SelectCharacterSceneName } from "../../Phaser/Login/SelectCharacterScene";
    import LL from "../../i18n/i18n-svelte";
    import { customizeAvailableStore, selectedCollection } from "../../Stores/SelectCharacterSceneStore";

    export let game: Game;

    const selectCharacterScene = game.scene.getScene(SelectCharacterSceneName) as SelectCharacterScene;

    function selectLeft() {
        selectCharacterScene.selectPreviousCollection();
    }

    function selectRight() {
        selectCharacterScene.selectNextCollection();
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
    </section>
    <section class="category">
        <button class="selectCharacterButton selectCharacterButtonLeft nes-btn" on:click|preventDefault={selectLeft}>
            &lt;
        </button>
        <strong class="category-text">{$selectedCollection}</strong>
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
        {#if $customizeAvailableStore}
            <button
                type="submit"
                class="selectCharacterSceneFormCustomYourOwnSubmit nes-btn"
                on:click|preventDefault={customizeScene}>{$LL.woka.selectWoka.customize()}</button
            >
        {/if}
    </section>
</form>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    form.selectCharacterScene {
        font-family: "Press Start 2P";
        // pointer-events: visiblePainted;
        color: #ebeeee;

        section {
            margin: 5px;

            &.category {
                text-align: center;
                margin-top: 8vh;
                .category-text {
                    font-family: "Press Start 2P";
                    display: inline-block;
                    width: 70%;
                }
            }

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
                // position: absolute;
                // top: 15vh;
                margin: 0;
            }
        }

        button {
            font-family: "Press Start 2P";
            pointer-events: auto;
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
