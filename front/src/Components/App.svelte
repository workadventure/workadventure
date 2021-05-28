<script lang="typescript">
    import MenuIcon from "./Menu/MenuIcon.svelte";
    import {menuIconVisible} from "../Stores/MenuStore";
    import {gameOverlayVisibilityStore} from "../Stores/MediaStore";
    import CameraControls from "./CameraControls.svelte";
    import MyCamera from "./MyCamera.svelte";

</script>

<div>
    {#if $gameOverlayVisibilityStore}
    <!-- {#if $menuIconVisible}
    <MenuIcon  />
    {/if} -->
        <MyCamera></MyCamera>
        <CameraControls></CameraControls>
    {/if}
</div>
