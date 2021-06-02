<script lang="typescript">
    import MenuIcon from "./Menu/MenuIcon.svelte";
    import {menuIconVisible} from "../Stores/MenuStore";
    import {enableCameraSceneVisibilityStore, gameOverlayVisibilityStore} from "../Stores/MediaStore";
    import CameraControls from "./CameraControls.svelte";
    import MyCamera from "./MyCamera.svelte";
    import SelectCompanionScene from "./SelectCompanion/SelectCompanionScene.svelte";
    import {selectCompanionSceneVisibleStore} from "../Stores/SelectCompanionStore";
    import {selectCharacterSceneVisibleStore} from "../Stores/SelectCharacterStore";
    import SelectCharacterScene from "./selectCharacter/SelectCharacterScene.svelte";
    import {customCharacterSceneVisibleStore} from "../Stores/CustomCharacterStore";
    import CustomCharacterScene from "./CustomCharacterScene/CustomCharacterScene.svelte";
    import LoginScene from "./Login/LoginScene.svelte";
    import {loginSceneVisibleStore} from "../Stores/LoginSceneStore";
    import EnableCameraScene from "./EnableCamera/EnableCameraScene.svelte";

    import {Game} from "../Phaser/Game/Game";
    import {helpCameraSettingsVisibleStore} from "../Stores/HelpCameraSettingsStore";
    import HelpCameraSettingsPopup from "./HelpCameraSettings/HelpCameraSettingsPopup.svelte";

    export let game: Game;
</script>

<div>
{#if $gameOverlayVisibilityStore}
    <MyCamera></MyCamera>
    <CameraControls></CameraControls>
{/if}
<div class="absolute-overlay">
    {#if $loginSceneVisibleStore}
        <LoginScene game={game}></LoginScene>
    {/if}
    {#if $selectCharacterSceneVisibleStore}
        <SelectCharacterScene game={ game }></SelectCharacterScene>
    {/if}
    {#if $customCharacterSceneVisibleStore}
        <CustomCharacterScene game={ game }></CustomCharacterScene>
    {/if}
    {#if $selectCompanionSceneVisibleStore}
        <SelectCompanionScene game={ game }></SelectCompanionScene>
    {/if}
    {#if $enableCameraSceneVisibilityStore}
        <EnableCameraScene game={game}></EnableCameraScene>
    {/if}
    <!-- {#if $menuIconVisible}
    <MenuIcon  />
    {/if} -->
    {#if $helpCameraSettingsVisibleStore}
        <HelpCameraSettingsPopup game={ game }></HelpCameraSettingsPopup>
    {/if}
</div>
</div>
