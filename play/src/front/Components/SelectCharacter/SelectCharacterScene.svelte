<script lang="ts">
    import type { Game } from "../../Phaser/Game/Game";
    import type { SelectCharacterScene } from "../../Phaser/Login/SelectCharacterScene";
    import { SelectCharacterSceneName } from "../../Phaser/Login/SelectCharacterScene";
    import { LL } from "../../../i18n/i18n-svelte";
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
        selectCharacterScene.nextSceneToCameraScene().catch((e) => {
            console.error(e);
        });
    }

    function customizeScene() {
        selectCharacterScene.nextSceneToCustomizeScene();
    }
</script>

<section class="text-center">
    <h2 class="tw-text-white tw-text-2xl">{$LL.woka.selectWoka.title()}</h2>
</section>
<section class="category tw-flex tw-flex-row tw-justify-center">
    {#if $collectionsSizeStore > 1 && $selectedCollection}
        <button class="light tw-mr-2 selectCharacterButton" on:click|preventDefault={selectLeft}> &lt; </button>
        <strong class="category-text">{$selectedCollection}</strong>
        <button class="outline tw-ml-2 selectCharacterButton" on:click|preventDefault={selectRight}> &gt; </button>
    {/if}
</section>
<section class="action tw-flex tw-flex-row tw-justify-center">
    <button
        type="submit"
        class="light tw-mr-2 selectCharacterSceneFormSubmit"
        on:click={() => analyticsClient.selectWoka()}
        on:click={cameraScene}>{$LL.woka.selectWoka.continue()}</button
    >
    {#if $customizeAvailableStore}
        <button
            type="submit"
            class="outline tw-ml-2 selectCharacterSceneFormCustomYourOwnSubmit"
            on:click={() => analyticsClient.selectCustomWoka()}
            on:click={customizeScene}>{$LL.woka.selectWoka.customize()}</button
        >
    {/if}
</section>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    section {
        color: #ebeeee;
        height: auto;
        margin: 5px;

        &.category {
            text-align: center;
            margin-top: 8vh;
            .category-text {
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
            margin: 1px;
        }

        &.text-center {
            text-align: center;
        }

        button.selectCharacterButton {
            margin: 0;
        }
    }

    @media all and (max-device-width: 480px) {
        section {
            &.action {
                margin-top: 75vh;
            }
        }
    }

    button {
        pointer-events: auto;
    }
</style>
