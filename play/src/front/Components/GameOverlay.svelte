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
    import { showModalGlobalComminucationVisibilityStore } from "../Stores/ModalStore";
    import { isActivatedStore as calendarIsActivatedStore, isCalendarVisibleStore } from "../Stores/CalendarStore";
    import { isActivatedStore as todoListIsActivatedStore, isTodoListVisibleStore } from "../Stores/TodoListStore";
    import ChatSidebar from "../Chat/ChatSidebar.svelte";
    import LoginScene from "./Login/LoginScene.svelte";
    import MainLayout from "./MainLayout.svelte";
    import SelectCharacterScene from "./SelectCharacter/SelectCharacterScene.svelte";
    import SelectCompanionScene from "./SelectCompanion/SelectCompanionScene.svelte";
    import ErrorDialog from "./UI/ErrorDialog.svelte";
    import ErrorScreen from "./UI/ErrorScreen.svelte";
    import MapEditor from "./MapEditor/MapEditor.svelte";
    import RefreshPrompt from "./RefreshPrompt.svelte";
    import LoaderScene from "./Loader/LoaderScene.svelte";
    import EnableCameraScene from "./EnableCamera/EnableCameraScene.svelte";
    import bgMap from "./images/map-exemple.png";
    import defaultLoader from "./images/Workadventure.gif";
    import GlobalCommunicationModal from "./Modal/GlobalCommunicationModal.svelte";
    import Calendar from "./Calendar/Calendar.svelte";
    import TodoList from "./TodoList/TodoList.svelte";
    import FloatingUiPopupList from "./Util/FloatingUiPopupList.svelte";
    import MainModal from "./Modal/MainModal.svelte";

    export let game: Game;

    /**
     * When changing map from an exit on the current map, the Chat and the MainLayout are not really destroyed
     * due to an internal issue of Svelte, we use a #key directive to force the destruction of the components.
     * https://github.com/sveltejs/svelte/issues/5268
     */
</script>

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
    <div class="h-dvh overflow-y-auto">
        <LoginScene {game} />
    </div>
{:else if $selectCharacterSceneVisibleStore}
    <div>
        <SelectCharacterScene {game} />
    </div>
{:else if $selectCompanionSceneVisibleStore}
    <div>
        <SelectCompanionScene {game} />
    </div>
{:else if $enableCameraSceneVisibilityStore}
    <div class="h-dvh overflow-y-auto">
        <EnableCameraScene {game} />
    </div>
{:else if $gameSceneIsLoadedStore && !$loaderVisibleStore && !$selectCharacterCustomizeSceneVisibleStore}
    {#if $refreshPromptStore}
        <RefreshPrompt />
    {/if}
    {#key $forceRefreshChatStore}
        <ChatSidebar />
        {#if $mapEditorModeStore}
            <MapEditor />
        {/if}
        {#if $showModalGlobalComminucationVisibilityStore}
            <GlobalCommunicationModal />
        {/if}

        <MainLayout />
    {/key}
    <MainModal />

    {#if $calendarIsActivatedStore && $isCalendarVisibleStore}
        <Calendar />
    {/if}
    {#if $todoListIsActivatedStore && $isTodoListVisibleStore}
        <TodoList />
    {/if}
{/if}

<FloatingUiPopupList />
<!-- </div> -->
