<script lang="typescript">
    import MenuIcon from "./Menu/MenuIcon.svelte";
    import {menuIconVisible} from "../Stores/MenuStore";
    import {enableCameraSceneVisibilityStore, gameOverlayVisibilityStore} from "../Stores/MediaStore";
    import CameraControls from "./CameraControls.svelte";
    import MyCamera from "./MyCamera.svelte";
    import SelectCompanionScene from "./SelectCompanion/SelectCompanionScene.svelte";
    import {selectCompanionSceneVisibleStore} from "../Stores/SelectCompanionStore";
    import {Game} from "../Phaser/Game/Game";
    import LoginScene from "./Login/LoginScene.svelte";
    import {loginSceneVisibleStore} from "../Stores/LoginSceneStore";
    import EnableCameraScene from "./EnableCamera/EnableCameraScene.svelte";

    export let game: Game;
</script>

<div>
    {#if $loginSceneVisibleStore}
        <LoginScene game={game}></LoginScene>
    {/if}
    {#if $selectCompanionSceneVisibleStore}
        <SelectCompanionScene game={game}></SelectCompanionScene>
    {/if}
    {#if $enableCameraSceneVisibilityStore}
        <EnableCameraScene game={game}></EnableCameraScene>
    {/if}
    <!-- {#if $menuIconVisible}
    <MenuIcon  />
    {/if} -->
    {#if $gameOverlayVisibilityStore}
        <MyCamera></MyCamera>
        <CameraControls></CameraControls>
    {/if}
</div>
