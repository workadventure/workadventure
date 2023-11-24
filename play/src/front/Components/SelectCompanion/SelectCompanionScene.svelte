<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import type { Game } from "../../Phaser/Game/Game";
    import type { SelectCompanionScene } from "../../Phaser/Login/SelectCompanionScene";
    import { SelectCompanionSceneName } from "../../Phaser/Login/SelectCompanionScene";
    import { collectionsSizeStore, selectedCollection } from "../../Stores/SelectCharacterSceneStore";

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
        selectCompanionScene.selectCompanion().catch((e) => console.error(e));
    }

    function selectLeftCollection() {
        selectCompanionScene.selectPreviousCompanionCollection();
    }

    function selectRightCollection() {
        selectCompanionScene.selectNextCompanionCollection();
    }
</script>

<form class="selectCompanionScene">
    <section class="text-center">
        <h2 class="tw-text-white tw-text-2xl">{$LL.companion.select.title()}</h2>
        {#if $collectionsSizeStore > 1 && $selectedCollection}
            <button
                class="outline tw-mr-2 selectCompanionCollectionButton selectCharacterButtonLeft"
                on:click|preventDefault={selectLeftCollection}
            >
                &lt;
            </button>
            <strong class="category-text">{$selectedCollection}</strong>
            <button
                class="outline tw-ml-2 selectCompanionCollectionButton selectCompanionButtonRight"
                on:click|preventDefault={selectRightCollection}
            >
                &gt;
            </button>
        {/if}
        <button class="outline selectCharacterButton selectCharacterButtonLeft" on:click|preventDefault={selectLeft}>
            &lt;
        </button>
        <button class="outline selectCharacterButton selectCharacterButtonRight" on:click|preventDefault={selectRight}>
            &gt;
        </button>
    </section>
    <section class="action tw-flex tw-flex-row tw-justify-center">
        <button href="/" class="outline tw-mr-2 selectCompanionSceneFormBack" on:click|preventDefault={noCompanion}
            >{$LL.companion.select.any()}</button
        >
        <button
            type="submit"
            class="light tw-ml-2 selectCompanionSceneFormSubmit"
            on:click|preventDefault={selectCompanion}>{$LL.companion.select.continue()}</button
        >
    </section>
</form>

<style lang="scss">
    @import "../../style/breakpoints.scss";

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

            button.selectCompanionCollectionButton {
                position: absolute;
                margin: 0;
            }
        }

        button.selectCharacterButtonLeft {
            left: 33vw;
        }

        button.selectCharacterButtonRight {
            right: 33vw;
        }

        button.selectCompanionButtonRight {
            right: 33vw;
            top: 4.5vh;
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
