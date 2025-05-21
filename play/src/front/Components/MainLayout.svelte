<script lang="ts">
    import { fly } from "svelte/transition";
    import { requestVisitCardsStore } from "../Stores/GameStore";
    import { helpNotificationSettingsVisibleStore, helpWebRtcSettingsVisibleStore } from "../Stores/HelpSettingsStore";
    import { helpSettingsPopupBlockedStore } from "../Stores/HelpSettingsPopupBlockedStore";
    import { menuVisiblilityStore, warningBannerStore } from "../Stores/MenuStore";
    import { showReportScreenStore, userReportEmpty } from "../Stores/ShowReportScreenStore";
    import { banMessageStore } from "../Stores/TypeMessageStore/BanMessageStore";
    import { textMessageStore } from "../Stores/TypeMessageStore/TextMessageStore";
    import { soundPlayingStore } from "../Stores/SoundPlayingStore";
    import { modalVisibilityStore, roomListVisibilityStore, showLimitRoomModalStore } from "../Stores/ModalStore";
    import { actionsMenuStore } from "../Stores/ActionsMenuStore";
    import { wokaMenuStore } from "../Stores/WokaMenuStore";
    import { showDesktopCapturerSourcePicker } from "../Stores/ScreenSharingStore";
    import { uiWebsitesStore } from "../Stores/UIWebsiteStore";
    import { coWebsites } from "../Stores/CoWebsiteStore";
    import { proximityMeetingStore } from "../Stores/MyMediaStore";
    import { notificationPlayingStore } from "../Stores/NotificationStore";
    import { popupStore } from "../Stores/PopupStore";
    import {
        mapEditorAskToClaimPersonalAreaStore,
        mapEditorSelectedToolStore,
        mapEditorVisibilityStore,
        mapExplorationObjectSelectedStore,
    } from "../Stores/MapEditorStore";
    import { warningMessageStore } from "../Stores/ErrorStore";
    import { gameManager, GameSceneNotFoundError } from "../Phaser/Game/GameManager";
    import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../Stores/ActionsCamStore";
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import { chatSidebarWidthStore } from "../Chat/ChatSidebarWidthStore";
    import { EditorToolName } from "../Phaser/Game/MapEditor/MapEditorModeManager";
    import { streamableCollectionStore } from "../Stores/StreamableCollectionStore";
    import ActionBar from "./ActionBar/ActionBar.svelte";
    import HelpWebRtcSettingsPopup from "./HelpSettings/HelpWebRtcSettingsPopup.svelte";
    import HelpNotificationSettingsPopup from "./HelpSettings/HelpNotificationSettingPopup.svelte";
    import Menu from "./Menu/Menu.svelte";
    import ReportMenu from "./ReportMenu/ReportMenu.svelte";
    import VisitCard from "./VisitCard/VisitCard.svelte";
    import WarningBanner from "./WarningContainer/WarningBanner.svelte";
    import BanMessageContainer from "./TypeMessage/BanMessageContainer.svelte";
    import TextMessageContainer from "./TypeMessage/TextMessageContainer.svelte";
    import AudioPlaying from "./UI/AudioPlaying.svelte";
    import LimitRoomModal from "./Modal/LimitRoomModal.svelte";
    import ActionsMenu from "./ActionsMenu/ActionsMenu.svelte";
    import WokaMenu from "./ActionsMenu/WokaMenu.svelte";
    import Lazy from "./Lazy.svelte";
    import UiWebsiteContainer from "./UI/Website/UIWebsiteContainer.svelte";
    import Modal from "./Modal/Modal.svelte";
    import HelpPopUpBlocked from "./HelpSettings/HelpPopUpBlocked.svelte";
    import Notification from "./UI/Notification.svelte";
    import ObjectDetails from "./Modal/ObjectDetails.svelte";
    import MapList from "./Exploration/MapList.svelte";
    import WarningToast from "./WarningContainer/WarningToast.svelte";
    import ClaimPersonalAreaDialogBox from "./MapEditor/ClaimPersonalAreaDialogBox.svelte";
    import AudioPlayer from "./AudioManager/AudioPlayer.svelte";
    import MediaBox from "./Video/MediaBox.svelte";
    import PresentationLayout from "./EmbedScreens/Layouts/PresentationLayout.svelte";
    import ExternalComponents from "./ExternalModules/ExternalComponents.svelte";
    import PictureInPicture from "./Video/PictureInPicture.svelte";
    import AudioStreamWrapper from "./Video/PictureInPicture/AudioStreamWrapper.svelte";
    import { mapEditorSideBarWidthStore } from "./MapEditor/MapEditorSideBarWidthStore";
    let keyboardEventIsDisable = false;

    const handleFocusInEvent = (event: FocusEvent) => {
        const target = event.target as HTMLElement | null;
        if (
            target &&
            (["INPUT", "TEXTAREA"].includes(target.tagName) ||
                (target.tagName === "DIV" && target.getAttribute("role") === "textbox") ||
                target.getAttribute("contenteditable") === "true" ||
                target.classList.contains("block-user-action"))
        ) {
            try {
                gameManager.getCurrentGameScene().userInputManager.disableControls("textField");
                keyboardEventIsDisable = true;
            } catch (error) {
                if (error instanceof GameSceneNotFoundError) {
                    keyboardEventIsDisable = false;
                    return;
                }
                throw error;
            }
        }
    };

    const handleFocusOutEvent = () => {
        if (!keyboardEventIsDisable) return;
        try {
            gameManager.getCurrentGameScene().userInputManager.restoreControls("textField");
            keyboardEventIsDisable = false;
        } catch (error) {
            if (error instanceof GameSceneNotFoundError) {
                keyboardEventIsDisable = false;
                return;
            }
            throw error;
        }
    };

    document.addEventListener("focusin", handleFocusInEvent);
    document.addEventListener("focusout", handleFocusOutEvent);

    $: marginLeft = $chatVisibilityStore ? $chatSidebarWidthStore : 0;
    $: marginRight =
        $mapEditorVisibilityStore && $mapEditorSelectedToolStore !== EditorToolName.WAMSettingsEditor
            ? $mapEditorSideBarWidthStore
            : 0;
</script>

<!-- Components ordered by z-index -->
<div
    id="main-layout"
    class="@container/main-layout absolute h-full w-full pointer-events-none {[...$coWebsites.values()].length === 0
        ? 'not-cowebsite'
        : ''}"
    style="padding-inline-start : {marginLeft}px; padding-inline-end: {marginRight}px "
>
    {#if $modalVisibilityStore}
        <div class="bg-black/60 w-full h-full fixed start-0 end-0" />
    {/if}

    {#if $highlightedEmbedScreen && $highlightFullScreen}
        <div class="w-full h-full fixed start-0 end-0">
            <MediaBox streamable={$highlightedEmbedScreen} isHighlighted={true} />
        </div>
        <!-- If we are in fullscreen, the other streams are not displayed. We should therefore play the audio of hidden streams -->
        {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
            {#if peer.uniqueId !== $highlightedEmbedScreen.uniqueId}
                <AudioStreamWrapper {peer} />
            {/if}
        {/each}
    {/if}

    <AudioPlayer />

    <div class="flex min-h-full flex-col-reverse mobile:flex-col">
        <section id="main-layout-main" class="pb-0 flex-1 pointer-events-none h-full w-full relative">
            <div class="fixed z-[1000] bottom-0 start-0 right-0 m-auto w-max mobile:w-[98vw] md:max-w-[80%]">
                <div class="popups flex items-end relative w-full justify-center mobile:mb-24 mb-4 h-[calc(100%-96px)]">
                    {#each $popupStore.slice().reverse() as popup, index (popup.uuid)}
                        <div class="popupwrapper popupwrapper-{index} w-full flex-1" in:fly={{ y: 150, duration: 550 }}>
                            <svelte:component
                                this={popup.component}
                                {...popup.props}
                                on:close={() => popupStore.removePopup(popup.uuid)}
                            />
                        </div>
                    {/each}
                </div>
            </div>

            <Lazy
                when={$showDesktopCapturerSourcePicker}
                component={() => import("./Video/DesktopCapturerSourcePicker.svelte")}
            />
            {#if $modalVisibilityStore}
                <Modal />
            {/if}

            {#if $menuVisiblilityStore}
                <Menu />
            {/if}

            {#if $banMessageStore.length > 0}
                <BanMessageContainer />
            {:else if $textMessageStore.length > 0}
                <TextMessageContainer />
            {/if}
            {#if $notificationPlayingStore}
                <div class="flex flex-col absolute w-auto end-0">
                    {#each [...$notificationPlayingStore.values()] as notification, index (`${index}-${notification.id}`)}
                        <Notification {notification} />
                    {/each}
                </div>
            {/if}

            {#if $warningBannerStore}
                <WarningBanner />
            {/if}

            {#if $showReportScreenStore !== userReportEmpty}
                <ReportMenu />
            {/if}

            {#if $helpNotificationSettingsVisibleStore}
                <HelpNotificationSettingsPopup />
            {/if}

            {#if $helpWebRtcSettingsVisibleStore !== "hidden" && $proximityMeetingStore === true}
                <HelpWebRtcSettingsPopup />
            {/if}

            {#if $helpSettingsPopupBlockedStore}
                <HelpPopUpBlocked />
            {/if}

            {#if $soundPlayingStore}
                <AudioPlaying url={$soundPlayingStore} />
            {/if}

            {#if $showLimitRoomModalStore}
                <LimitRoomModal />
            {/if}

            {#if !$highlightFullScreen}
                <PictureInPicture let:inPictureInPicture>
                    <PresentationLayout {inPictureInPicture} />
                </PictureInPicture>
            {/if}

            {#if $uiWebsitesStore}
                <UiWebsiteContainer />
            {/if}

            {#if $mapEditorAskToClaimPersonalAreaStore}
                <ClaimPersonalAreaDialogBox />
            {/if}

            {#if $mapExplorationObjectSelectedStore}
                <ObjectDetails />
            {/if}

            {#if $roomListVisibilityStore}
                <MapList />
            {/if}

            {#if $warningMessageStore.length > 0}
                <WarningToast />
            {/if}

            <ExternalComponents zone="popup" />
            <div class=" absolute top-0 bottom-0 w-full h-full flex items-center justify-center">
                {#if $requestVisitCardsStore}
                    <VisitCard visitCardUrl={$requestVisitCardsStore} />
                {/if}
                <ExternalComponents zone="centeredPopup" />
            </div>
        </section>
        <div class="">
            <!--<ActionBar />-->
        </div>
        <ActionBar />
    </div>

    {#if $wokaMenuStore}
        <WokaMenu />
    {:else if $actionsMenuStore}
        <ActionsMenu />
    {/if}
</div>

<style lang="scss">
    @import "../style/breakpoints.scss";

    .popups {
        z-index: 1000;
        .popupwrapper {
            &:not(:first-child) {
                position: absolute;
                width: 100%;
                height: 100%;
                overflow: hidden;
                border-radius: 0.5rem;
                transition-property: all;
                transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                transition-duration: 300ms;
            }
            &:first-child {
                position: relative;
                z-index: 505;
            }
            &:nth-child(n + 5) {
                /* Hide popups after 4 popups */
                display: none;
            }
            // For each popups but not first
            @for $i from 1 through 4 {
                &:nth-child(#{$i + 1}) {
                    top: -$i * 16px;
                    filter: blur($i + 0px);
                    opacity: 1 - ($i * 0.1);
                    transform: scale(1 - ($i * 0.05));
                }
            }
        }
    }

    #main-layout {
        container-type: size;
    }
</style>
