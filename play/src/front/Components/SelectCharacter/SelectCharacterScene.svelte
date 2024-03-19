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

<section class="text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[calc(50%+20vh)] h-16">
    <span class="text-white text-lg bold">
        {$LL.woka.selectWoka.title()}
    </span>
</section>
<section class="category flex flex-row justify-center">
    {#if $collectionsSizeStore > 1 && $selectedCollection}
        <button class="light mr-2 selectCharacterButton" on:click|preventDefault={selectLeft}> &lt; </button>
        <strong class="category-text">{$selectedCollection}</strong>
        <button class="outline ml-2 selectCharacterButton" on:click|preventDefault={selectRight}> &gt; </button>
    {/if}
</section>
<section
    class="action flex flex-row justify-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[calc(50%-35vh)] h-10"
>
    {#if $customizeAvailableStore}
        <button
            type="submit"
            class="btn btn-lg btn-light btn-border mr-4 selectCharacterSceneFormCustomYourOwnSubmit"
            on:click={() => analyticsClient.selectCustomWoka()}
            on:click={customizeScene}>{$LL.woka.selectWoka.customize()}</button
        >
    {/if}
    <button
        type="submit"
        class="btn btn-lg btn-secondary selectCharacterSceneFormSubmit"
        on:click={() => analyticsClient.selectWoka()}
        on:click={cameraScene}>{$LL.woka.selectWoka.continue()}</button
    >
</section>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    button {
        pointer-events: auto;
    }
</style>
