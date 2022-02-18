<script lang="typescript">
    import type { Game } from "../Phaser/Game/Game";
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import { customCharacterSceneVisibleStore } from "../Stores/CustomCharacterStore";
    import { errorStore } from "../Stores/ErrorStore";
    import { loginSceneVisibleStore } from "../Stores/LoginSceneStore";
    import { enableCameraSceneVisibilityStore } from "../Stores/MediaStore";
    import { selectCharacterSceneVisibleStore } from "../Stores/SelectCharacterStore";
    import { selectCompanionSceneVisibleStore } from "../Stores/SelectCompanionStore";
    import Chat from "./Chat/Chat.svelte";
    import CustomCharacterScene from "./CustomCharacterScene/CustomCharacterScene.svelte";
    import EnableCameraScene from "./EnableCamera/EnableCameraScene.svelte";
    import LoginScene from "./Login/LoginScene.svelte";
    import MainLayout from "./MainLayout.svelte";
    import SelectCharacterScene from "./selectCharacter/SelectCharacterScene.svelte";
    import SelectCompanionScene from "./SelectCompanion/SelectCompanionScene.svelte";
    import ErrorDialog from "./UI/ErrorDialog.svelte";

    export let game: Game;
</script>

{#if $errorStore.length > 0}
    <div>
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
{:else if $customCharacterSceneVisibleStore}
    <div>
        <CustomCharacterScene {game} />
    </div>
{:else if $selectCompanionSceneVisibleStore}
    <div>
        <SelectCompanionScene {game} />
    </div>
{:else if $enableCameraSceneVisibilityStore}
    <div class="scrollable">
        <EnableCameraScene {game} />
    </div>
{:else}
    <MainLayout />

    {#if $chatVisibilityStore}
        <Chat />
    {/if}
{/if}
