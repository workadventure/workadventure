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
    import { IconChevronLeft, IconChevronRight } from "@wa-icons";

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
        <button class="light mr-2 selectCharacterButton" on:click|preventDefault={selectLeft}>
            <IconChevronLeft />
        </button>
        <strong class="category-text">{$selectedCollection}</strong>
        <button class="outline ml-2 selectCharacterButton" on:click|preventDefault={selectRight}>
            <IconChevronRight />
        </button>
    {/if}
</section>
<div
    class="fixed bottom-0 w-full bg-contrast/80 backdrop-blur-md border border-solid border-t border-b-0 border-x-0 border-white/10"
>
    <section
        class="action container m-auto p-4 flex flex-col-reverse md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 justify-between"
    >
        {#if $customizeAvailableStore}
            <button
                type="submit"
                class="btn btn-light btn-lg btn-ghost w-full md:w-1/2 block selectCharacterSceneFormCustomYourOwnSubmit"
                on:click={() => analyticsClient.selectCustomWoka()}
                on:click={customizeScene}
            >
                <div class="btn-label">{$LL.woka.selectWoka.customize()}</div>
            </button>
        {/if}
        <button
            type="submit"
            class="btn btn-secondary btn-lg w-full md:w-1/2 block selectCharacterSceneFormSubmit"
            on:click={() => analyticsClient.selectWoka()}
            on:click={cameraScene}
        >
            <div class="btn-label">{$LL.woka.selectWoka.continue()}</div>
        </button>
    </section>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    button {
        pointer-events: auto;
    }
</style>
