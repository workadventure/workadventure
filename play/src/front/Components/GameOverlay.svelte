<script lang="ts">
    import type { Game } from "../Phaser/Game/Game";
    import { errorStore } from "../Stores/ErrorStore";
    import { errorScreenStore } from "../Stores/ErrorScreenStore";
    import { loginSceneVisibleStore } from "../Stores/LoginSceneStore";
    import { enableCameraSceneVisibilityStore } from "../Stores/MediaStore";
    import {
        selectCharacterSceneVisibleStore,
        selectCharacterCustomizeSceneVisibleStore,
    } from "../Stores/SelectCharacterStore";
    import { selectCompanionSceneVisibleStore } from "../Stores/SelectCompanionStore";
    import { gameSceneIsLoadedStore } from "../Stores/GameSceneStore";
    import { mapEditorModeStore } from "../Stores/MapEditorStore";
    import { refreshPromptStore } from "../Stores/RefreshPromptStore";
    import { forceRefreshChatStore } from "../Stores/ChatStore";
    import { loaderVisibleStore } from "../Stores/LoaderStore";
    import LoginScene from "./Login/LoginScene.svelte";
    import MainLayout from "./MainLayout.svelte";
    import SelectCharacterScene from "./SelectCharacter/SelectCharacterScene.svelte";
    import SelectCompanionScene from "./SelectCompanion/SelectCompanionScene.svelte";
    import ErrorDialog from "./UI/ErrorDialog.svelte";
    import ErrorScreen from "./UI/ErrorScreen.svelte";
    import Chat from "./Chat/Chat.svelte";
    import MapEditor from "./MapEditor/MapEditor.svelte";
    import RefreshPrompt from "./RefreshPrompt.svelte";
    import LoaderScene from "./Loader/LoaderScene.svelte";
    import EnableCameraScene from "./EnableCamera/EnableCameraScene.svelte";
    import bgMap from "./images/map-exemple.png";
    import defaultLoader from "./images/Workadventure.gif";
    import { onMount } from "svelte";

    export let game: Game;

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    let gameOverlayStyle = document.getElementById("gameoverlay");

    onMount(() => {
        console.log("GameOverlay mounted");
        mediaQuery.addEventListener("change", (e: any) => handleTabletChange(e));
        handleTabletChange(mediaQuery);
        console.log(gameOverlayStyle);
    });

    function handleTabletChange(e: MediaQueryList) {
        console.log(gameOverlayStyle);
        if (e.matches) {
            if (gameOverlayStyle) {
                console.log("Tablet détecté");
                gameOverlayStyle.style.position = "fixed";
            }
        } else {
            if (gameOverlayStyle) {
                console.log("Tablet not detected");
                gameOverlayStyle.style.position = "absolute";
            }
        }
    }

    /**
     * When changing map from an exit on the current map, the Chat and the MainLayout are not really destroyed
     * due to an internal issue of Svelte, we use a #key directive to force the destruction of the components.
     * https://github.com/sveltejs/svelte/issues/5268
     */
</script>

<div class="h-full w-full absolute" id="gameoverlay">
    <!--Voir pour l'enlever juste en responsive-->
    <!--Voir pour virer la position absolute-->
    <!-- Preload image loader TODO HUGO : Better way ? -->
    <link rel="preload" as="image" href={bgMap} />
    <link rel="preload" as="image" href={defaultLoader} />

    {#if $loaderVisibleStore}
        <div class="bg-contrast">
            <LoaderScene />
        </div>
    {/if}
    {#if $errorScreenStore !== undefined}
        <div class="bg-contrast">
            <ErrorScreen />
        </div>
    {:else if $errorStore.length > 0}
        <div class="bg-contrast">
            <ErrorDialog />
        </div>
    {:else if $loginSceneVisibleStore}
        <div class="scrollable">
            <LoginScene {game} />
        </div>
    {:else if $selectCharacterSceneVisibleStore}
        <div>
            <SelectCharacterScene {game} />
        </div>
    {:else if $selectCompanionSceneVisibleStore}
        <div class="bg-contrast">
            <SelectCompanionScene {game} />
        </div>
    {:else if $enableCameraSceneVisibilityStore}
        <div class="scrollable">
            <EnableCameraScene {game} />
        </div>
    {:else if $gameSceneIsLoadedStore && !$loaderVisibleStore && !$selectCharacterCustomizeSceneVisibleStore}
        {#if $refreshPromptStore}
            <RefreshPrompt />
        {/if}
        {#key $forceRefreshChatStore}
            <Chat />
            {#if $mapEditorModeStore}
                <MapEditor />
            {/if}
            <MainLayout />
        {/key}
    {/if}
</div>
