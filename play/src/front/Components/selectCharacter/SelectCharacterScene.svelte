<script lang="ts">
    import type { Game } from "../../Phaser/Game/Game";
    import type { SelectCharacterScene} from "../../Phaser/Login/SelectCharacterScene";
    import { SelectCharacterSceneName } from "../../Phaser/Login/SelectCharacterScene";
    import LL from "../../../i18n/i18n-svelte";
    import {
        collectionsSizeStore,
        customizeAvailableStore,
        selectedCollection,
    } from "../../Stores/SelectCharacterSceneStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";

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

<section class="text-center">
    <h2>{$LL.woka.selectWoka.title()}</h2>
</section>
<section class="category">
    {#if $collectionsSizeStore > 1}
        <button class="selectCharacterButton nes-btn" on:click|preventDefault={selectLeft}> &lt; </button>
        <strong class="category-text">{$selectedCollection}</strong>
        <button class="selectCharacterButton nes-btn" on:click|preventDefault={selectRight}> &gt; </button>
    {/if}
</section>
<section class="action">
    <button
        type="submit"
        class="selectCharacterSceneFormSubmit nes-btn is-primary"
        on:click={() => analyticsClient.selectWoka()}
        on:click={cameraScene}>{$LL.woka.selectWoka.continue()}</button
    >
    {#if $customizeAvailableStore}
        <button
            type="submit"
            class="selectCharacterSceneFormCustomYourOwnSubmit nes-btn"
            on:click={() => analyticsClient.selectCustomWoka()}
            on:click={customizeScene}>{$LL.woka.selectWoka.customize()}</button
        >
    {/if}
</section>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    section {
        font-family: "Press Start 2P";
        color: #ebeeee;
        height: auto;
        margin: 5px;

        &.category {
            text-align: center;
            margin-top: 8vh;
            .category-text {
                font-family: "Press Start 2P";
                display: inline-block;
                width: 65%;
            }
        }

        &.action {
            position: absolute;
            margin-top: 80vh;
            top: 0;
            width: 100%;
            text-align: center;
        }

        h2 {
            font-family: "Press Start 2P";
            margin: 1px;
        }

        &.text-center {
            text-align: center;
        }

        button.selectCharacterButton {
            margin: 0;
        }
    }

    button {
        font-family: "Press Start 2P";
        pointer-events: auto;
    }
</style>
