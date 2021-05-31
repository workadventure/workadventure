<script lang="typescript">
    import MenuIcon from "./Menu/MenuIcon.svelte";
    import {menuIconVisible} from "../Stores/MenuStore";
    import {gameOverlayVisibilityStore} from "../Stores/MediaStore";
    import CameraControls from "./CameraControls.svelte";
    import MyCamera from "./MyCamera.svelte";
    import SelectCompanionScene from "./SelectCompanion/SelectCompanionScene.svelte";
    import {selectCompanionSceneVisibleStore} from "../Stores/SelectCompanionStore";
    import {selectCharacterSceneVisibleStore} from "../Stores/SelectCharacterStore";
    import SelectCharacterScene from "./selectCharacter/SelectCharacterScene.svelte";
    import {customCharacterSceneVisibleStore} from "../Stores/CustomCharacterStore";

    import {Game} from "../Phaser/Game/Game";
    import CustomCharacterScene from "./CustomCharacterScene/CustomCharacterScene.svelte";


    export let game: Game;

</script>

<div>
    {#if $selectCharacterSceneVisibleStore}
        <SelectCharacterScene game={ game }></SelectCharacterScene>
    {/if}
    {#if $customCharacterSceneVisibleStore}
        <CustomCharacterScene game={ game }></CustomCharacterScene>
    {/if}
    {#if $selectCompanionSceneVisibleStore}
        <SelectCompanionScene game={ game }></SelectCompanionScene>
    {/if}
    <!-- {#if $menuIconVisible}
    <MenuIcon  />
    {/if} -->
    {#if $gameOverlayVisibilityStore}
        <MyCamera></MyCamera>
        <CameraControls></CameraControls>
    {/if}
</div>
