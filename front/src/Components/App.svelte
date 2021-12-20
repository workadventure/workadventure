<script lang="typescript">
    import MenuIcon from "./Menu/MenuIcon.svelte";
    import { menuIconVisiblilityStore, menuVisiblilityStore } from "../Stores/MenuStore";
    import { emoteMenuStore } from "../Stores/EmoteStore";
    import { enableCameraSceneVisibilityStore } from "../Stores/MediaStore";
    import CameraControls from "./CameraControls.svelte";
    import MyCamera from "./MyCamera.svelte";
    import SelectCompanionScene from "./SelectCompanion/SelectCompanionScene.svelte";
    import { selectCompanionSceneVisibleStore } from "../Stores/SelectCompanionStore";
    import { selectCharacterSceneVisibleStore } from "../Stores/SelectCharacterStore";
    import SelectCharacterScene from "./selectCharacter/SelectCharacterScene.svelte";
    import { customCharacterSceneVisibleStore } from "../Stores/CustomCharacterStore";
    import { errorStore } from "../Stores/ErrorStore";
    import CustomCharacterScene from "./CustomCharacterScene/CustomCharacterScene.svelte";
    import LoginScene from "./Login/LoginScene.svelte";
    import Chat from "./Chat/Chat.svelte";
    import { loginSceneVisibleStore } from "../Stores/LoginSceneStore";
    import EnableCameraScene from "./EnableCamera/EnableCameraScene.svelte";
    import VisitCard from "./VisitCard/VisitCard.svelte";
    import { requestVisitCardsStore } from "../Stores/GameStore";

    import type { Game } from "../Phaser/Game/Game";
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import { helpCameraSettingsVisibleStore } from "../Stores/HelpCameraSettingsStore";
    import HelpCameraSettingsPopup from "./HelpCameraSettings/HelpCameraSettingsPopup.svelte";
    import AudioPlaying from "./UI/AudioPlaying.svelte";
    import { soundPlayingStore } from "../Stores/SoundPlayingStore";
    import ErrorDialog from "./UI/ErrorDialog.svelte";
    import Menu from "./Menu/Menu.svelte";
    import EmoteMenu from "./EmoteMenu/EmoteMenu.svelte";
    import VideoOverlay from "./Video/VideoOverlay.svelte";
    import { gameOverlayVisibilityStore } from "../Stores/GameOverlayStoreVisibility";
    import AdminMessage from "./TypeMessage/BanMessage.svelte";
    import TextMessage from "./TypeMessage/TextMessage.svelte";
    import { banMessageVisibleStore } from "../Stores/TypeMessageStore/BanMessageStore";
    import { textMessageVisibleStore } from "../Stores/TypeMessageStore/TextMessageStore";
    import { warningContainerStore } from "../Stores/MenuStore";
    import WarningContainer from "./WarningContainer/WarningContainer.svelte";
    import { layoutManagerVisibilityStore } from "../Stores/LayoutManagerStore";
    import LayoutManager from "./LayoutManager/LayoutManager.svelte";
    import { audioManagerVisibilityStore } from "../Stores/AudioManagerStore";
    import AudioManager from "./AudioManager/AudioManager.svelte";
    import { showReportScreenStore, userReportEmpty } from "../Stores/ShowReportScreenStore";
    import ReportMenu from "./ReportMenu/ReportMenu.svelte";
    import { followStateStore, followStates } from "../Stores/FollowStore";
    import { peerStore } from "../Stores/PeerStore";
    import FollowMenu from "./FollowMenu/FollowMenu.svelte";

    export let game: Game;
</script>

<div>
    {#if $loginSceneVisibleStore}
        <div class="scrollable">
            <LoginScene {game} />
        </div>
    {/if}
    {#if $selectCharacterSceneVisibleStore}
        <div>
            <SelectCharacterScene {game} />
        </div>
    {/if}
    {#if $customCharacterSceneVisibleStore}
        <div>
            <CustomCharacterScene {game} />
        </div>
    {/if}
    {#if $selectCompanionSceneVisibleStore}
        <div>
            <SelectCompanionScene {game} />
        </div>
    {/if}
    {#if $enableCameraSceneVisibilityStore}
        <div class="scrollable">
            <EnableCameraScene {game} />
        </div>
    {/if}
    {#if $banMessageVisibleStore}
        <div>
            <AdminMessage />
        </div>
    {/if}
    {#if $textMessageVisibleStore}
        <div>
            <TextMessage />
        </div>
    {/if}
    {#if $soundPlayingStore}
        <div>
            <AudioPlaying url={$soundPlayingStore} />
        </div>
    {/if}
    {#if $audioManagerVisibilityStore}
        <div>
            <AudioManager />
        </div>
    {/if}
    {#if $layoutManagerVisibilityStore}
        <div>
            <LayoutManager />
        </div>
    {/if}
    {#if $showReportScreenStore !== userReportEmpty}
        <div>
            <ReportMenu />
        </div>
    {/if}
    {#if $followStateStore !== followStates.off || $peerStore.size > 0}
        <div>
            <FollowMenu />
        </div>
    {/if}
    {#if $menuIconVisiblilityStore}
        <div>
            <MenuIcon />
        </div>
    {/if}
    {#if $menuVisiblilityStore}
        <div>
            <Menu />
        </div>
    {/if}
    {#if $emoteMenuStore}
        <div>
            <EmoteMenu />
        </div>
    {/if}
    {#if $gameOverlayVisibilityStore}
        <div>
            <VideoOverlay />
            <MyCamera />
            <CameraControls />
        </div>
    {/if}
    {#if $helpCameraSettingsVisibleStore}
        <div>
            <HelpCameraSettingsPopup />
        </div>
    {/if}
    {#if $requestVisitCardsStore}
        <VisitCard visitCardUrl={$requestVisitCardsStore} />
    {/if}
    {#if $errorStore.length > 0}
        <div>
            <ErrorDialog />
        </div>
    {/if}
    {#if $chatVisibilityStore}
        <Chat />
    {/if}
    {#if $warningContainerStore}
        <WarningContainer />
    {/if}
</div>
