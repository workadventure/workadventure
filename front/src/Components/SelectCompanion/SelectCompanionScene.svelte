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
        <button class="selectCharacterButton selectCharacterButtonLeft btn light" on:click|preventDefault={selectLeft}>
            &lt;
        </button>
        <button class="selectCharacterButton selectCharacterButtonRight btn light" on:click|preventDefault={selectRight}>
            &gt;
        </button>
    </section>
    <section class="action">
        <button
            type="submit"
            class="selectCompanionSceneFormSubmit btn light is-primary"
            on:click|preventDefault={selectCompanion}>{$LL.companion.select.continue()}</button
        >
        <button href="/" class="selectCompanionSceneFormBack btn light is-secondary" on:click|preventDefault={noCompanion}
            >{$LL.companion.select.any()}</button
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
                button{
                    position: relative;
                    display: inline-block;
                    user-select: none;
                    padding: 6px 8px;
                    margin: 4px;
                    text-align: center;
                    vertical-align: middle;
                    border-image-slice: 2;
                    border-image-width: 2;
                    border-image-repeat: stretch;
                }
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
