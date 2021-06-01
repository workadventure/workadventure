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
    import VisitCard from "./VisitCard/VisitCard.svelte";
    import {requestVisitCardsStore} from "../Stores/GameStore";

    import {Game} from "../Phaser/Game/Game";
    import {helpCameraSettingsVisibleStore} from "../Stores/HelpCameraSettingsStore";
    import HelpCameraSettingsPopup from "./HelpCameraSettings/HelpCameraSettingsPopup.svelte";
    import AudioPlaying from "./UI/AudioPlaying.svelte";
    import {soundPlayingStore} from "../Stores/SoundPlayingStore";

    export let game: Game;
</script>

<div>
    {#if $loginSceneVisibleStore}
        <div class="scrollable">
            <LoginScene game={game}></LoginScene>
        </div>
    {/if}
    {#if $selectCharacterSceneVisibleStore}
        <div>
            <SelectCharacterScene game={ game }></SelectCharacterScene>
        </div>
    {/if}
    {#if $customCharacterSceneVisibleStore}
        <div>
           <CustomCharacterScene game={ game }></CustomCharacterScene>
        </div>
    {/if}
    {#if $selectCompanionSceneVisibleStore}
        <div>
            <SelectCompanionScene game={ game }></SelectCompanionScene>
        </div>
    {/if}
    {#if $enableCameraSceneVisibilityStore}
        <div class="scrollable">
            <EnableCameraScene game={game}></EnableCameraScene>
        </div>
    {/if}
    {#if $soundPlayingStore}
    <div>
        <AudioPlaying url={$soundPlayingStore} />
    </div>
    {/if}

    <!--
    {#if $menuIconVisible}
        <div>
            <MenuIcon  />
        </div>
    {/if}
    -->
    {#if $gameOverlayVisibilityStore}
        <div>
            <MyCamera></MyCamera>
            <CameraControls></CameraControls>
        </div>
    {/if}
    {#if $helpCameraSettingsVisibleStore}
        <div>
            <HelpCameraSettingsPopup game={ game }></HelpCameraSettingsPopup>
        </div>
    {/if}
    {#if $requestVisitCardsStore}
        <VisitCard visitCardUrl={$requestVisitCardsStore}></VisitCard>
    {/if}
</div>
