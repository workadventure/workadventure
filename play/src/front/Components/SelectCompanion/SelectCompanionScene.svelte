<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import type { Game } from "../../Phaser/Game/Game";
    import type { SelectCompanionScene } from "../../Phaser/Login/SelectCompanionScene";
    import { SelectCompanionSceneName } from "../../Phaser/Login/SelectCompanionScene";
    import { collectionsSizeStore, selectedCollection } from "../../Stores/SelectCharacterSceneStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";

    export let game: Game;

    const selectCompanionScene = game.scene.getScene(SelectCompanionSceneName) as SelectCompanionScene;

    /*function selectLeft() {
        selectCompanionScene.moveToLeft();
    }

    function selectRight() {
        selectCompanionScene.moveToRight();
    }*/

    function noCompanion() {
        selectCompanionScene.noCompagnion().catch((e) => console.error(e));
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

<section class="text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[calc(50%+20vh)] h-16">
    <span class="text-white text-lg bold">
        {$LL.companion.select.title()}
    </span>
</section>
<section class="category flex flex-row justify-center">
    {#if $collectionsSizeStore > 1 && $selectedCollection}
        <button class="light mr-2 selectCharacterButton" on:click|preventDefault={selectLeftCollection}> &lt; </button>
        <strong class="category-text">{$selectedCollection}</strong>
        <button class="outline ml-2 selectCharacterButton" on:click|preventDefault={selectRightCollection}>
            &gt;
        </button>
    {/if}
</section>
<section
    class="action flex flex-row justify-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[calc(50%-35vh)] h-10"
>
    <button
        class="btn btn-lg btn-light btn-border mr-4 selectCompanionSceneFormBack"
        on:click|preventDefault={noCompanion}>{$LL.companion.select.any()}</button
    >
    <button
        type="submit"
        class="btn btn-lg btn-secondary selectCompanionSceneFormSubmit"
        on:click|preventDefault={() => analyticsClient.selectCompanion()}
        on:click|preventDefault={selectCompanion}>{$LL.companion.select.continue()}</button
    >
</section>

<!--<form class="selectCompanionScene">-->
<!--    <section class="text-center">-->
<!--        <h2 class="text-white text-2xl">{$LL.companion.select.title()}</h2>-->
<!--        {#if $collectionsSizeStore > 1 && $selectedCollection}-->
<!--            <button-->
<!--                class="outline mr-2 selectCompanionCollectionButton selectCharacterButtonLeft"-->
<!--                on:click|preventDefault={selectLeftCollection}-->
<!--            >-->
<!--                &lt;-->
<!--            </button>-->
<!--            <strong class="category-text">{$selectedCollection}</strong>-->
<!--            <button-->
<!--                class="outline ml-2 selectCompanionCollectionButton selectCompanionButtonRight"-->
<!--                on:click|preventDefault={selectRightCollection}-->
<!--            >-->
<!--                &gt;-->
<!--            </button>-->
<!--        {/if}-->
<!--        <button class="outline selectCharacterButton selectCharacterButtonLeft" on:click|preventDefault={selectLeft}>-->
<!--            &lt;-->
<!--        </button>-->
<!--        <button class="outline selectCharacterButton selectCharacterButtonRight" on:click|preventDefault={selectRight}>-->
<!--            &gt;-->
<!--        </button>-->
<!--    </section>-->
<!--    <section class="action flex flex-row justify-center">-->
<!--        <button class="outline mr-2 selectCompanionSceneFormBack" on:click|preventDefault={noCompanion}-->
<!--            >{$LL.companion.select.any()}</button-->
<!--        >-->
<!--        <button-->
<!--            type="submit"-->
<!--            class="light ml-2 selectCompanionSceneFormSubmit"-->
<!--            on:click|preventDefault={() => analyticsClient.selectWoka()}-->
<!--            on:click|preventDefault={selectCompanion}>{$LL.companion.select.continue()}</button-->
<!--        >-->
<!--    </section>-->

<!--</form>-->
<style lang="scss">
    @import "../../style/breakpoints.scss";

    button {
        pointer-events: auto;
    }
</style>
