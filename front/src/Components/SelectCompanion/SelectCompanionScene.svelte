<script lang="ts">
    import LL from "../../i18n/i18n-svelte";
    import type { Game } from "../../Phaser/Game/Game";
    import { SelectCompanionScene, SelectCompanionSceneName } from "../../Phaser/Login/SelectCompanionScene";

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
        <h2>{$LL.companion.select.title()}</h2>
        <button class="selectCharacterButton selectCharacterButtonLeft light" on:click|preventDefault={selectLeft}>
            &lt;
        </button>
        <button class="selectCharacterButton selectCharacterButtonRight light" on:click|preventDefault={selectRight}>
            &gt;
        </button>
    </section>
    <section class="action">
        <button href="/" class="selectCompanionSceneFormBack light" on:click|preventDefault={noCompanion}
            >{$LL.companion.select.any()}</button
        >
        <button
            type="submit"
            class="selectCompanionSceneFormSubmit light is-primary"
            on:click|preventDefault={selectCompanion}>{$LL.companion.select.continue()}</button
        >
    </section>
</form>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    form.selectCompanionScene {
        pointer-events: auto;
        color: #ebeeee;

        section {
            margin: 10px;

            &.action {
                text-align: center;
                margin-top: 55vh;
            }

            h2 {
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

    @include media-breakpoint-up(md) {
        form.selectCompanionScene button.selectCharacterButtonLeft {
            left: 5vw;
        }
        form.selectCompanionScene button.selectCharacterButtonRight {
            right: 5vw;
        }
    }
</style>
