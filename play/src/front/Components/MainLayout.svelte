<script lang="ts">
    import { fly } from "svelte/transition";
    import { emoteDataStoreLoading, emoteMenuStore } from "../Stores/EmoteStore";
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
    import { showDesktopCapturerSourcePicker } from "../Stores/ScreenSharingStore";
    import { uiWebsitesStore } from "../Stores/UIWebsiteStore";
    import { coWebsites } from "../Stores/CoWebsiteStore";
    import { proximityMeetingStore } from "../Stores/MyMediaStore";
    import { notificationPlayingStore } from "../Stores/NotificationStore";
    import { popupStore } from "../Stores/PopupStore";
    import { visibilityStore } from "../Stores/VisibilityStore";
    import { streamableCollectionStore } from "../Stores/StreamableCollectionStore";
    import { mapEditorAskToClaimPersonalAreaStore, mapExplorationObjectSelectedStore } from "../Stores/MapEditorStore";
    import { warningMessageStore } from "../Stores/ErrorStore";
    import { silentStore } from "../Stores/MediaStore";
    import { gameManager, GameSceneNotFoundError } from "../Phaser/Game/GameManager";
    import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../Stores/ActionsCamStore";
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
    import Lazy from "./Lazy.svelte";
    import UiWebsiteContainer from "./UI/Website/UIWebsiteContainer.svelte";
    import Modal from "./Modal/Modal.svelte";
    import HelpPopUpBlocked from "./HelpSettings/HelpPopUpBlocked.svelte";
    import Notification from "./UI/Notification.svelte";
    import ObjectDetails from "./Modal/ObjectDetails.svelte";
    import MapList from "./Exploration/MapList.svelte";
    import WarningToast from "./WarningContainer/WarningToast.svelte";
    import ClaimPersonalAreaDialogBox from "./MapEditor/ClaimPersonalAreaDialogBox.svelte";
    import MainModal from "./Modal/MainModal.svelte";
    import AudioPlayer from "./AudioManager/AudioPlayer.svelte";
    import MediaBox from "./Video/MediaBox.svelte";
    import PresentationLayout from "./EmbedScreens/Layouts/PresentationLayout.svelte";
    import ExternalComponents from "./ExternalModules/ExternalComponents.svelte";
    import PictureInPicture from "./Video/PictureInPicture.svelte";
    import SilentBlock from "./ActionBar/SilentBlock.svelte";
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
                gameManager.getCurrentGameScene().userInputManager.disableControls();
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
            gameManager.getCurrentGameScene().userInputManager.restoreControls();
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
</script>

<!-- Components ordered by z-index -->
<div
    id="main-layout"
    class="@container/main-layout absolute h-full w-full pointer-events-none {[...$coWebsites.values()].length === 0
        ? 'not-cowebsite'
        : ''}"
>
    {#if $modalVisibilityStore}
        <div class="bg-black/60 w-full h-full fixed left-0 right-0" />
    {/if}

    {#if $highlightedEmbedScreen && $highlightFullScreen}
        <div class="w-full h-full fixed left-0 right-0">
            <MediaBox streamable={$highlightedEmbedScreen} isHighlighted={true} />
        </div>
    {/if}

    <AudioPlayer />

    <div class="flex min-h-dvh flex-col-reverse mobile:flex-col">
        <section id="main-layout-main" class="pb-0 flex-1 pointer-events-none h-full w-full relative">
            <div class="fixed z-[1000] bottom-0 left-0 right-0 m-auto w-max max-w-[80%]">
                <div class="popups flex items-end relative w-full justify-center mb-4 h-[calc(100%-96px)]">
                    {#each $popupStore.slice().reverse() as popup, index (popup.uuid)}
                        <div class="popupwrapper popupwrapper-{index} flex-1" in:fly={{ y: 150, duration: 550 }}>
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
                <div class="flex flex-col absolute w-auto right-0">
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

            {#if $requestVisitCardsStore}
                <VisitCard visitCardUrl={$requestVisitCardsStore} />
            {/if}

            {#if !$highlightFullScreen}
                <PresentationLayout />
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
                <ExternalComponents zone="centeredPopup" />
            </div>

            <MainModal />
        </section>
        <div class="">
            <!--<ActionBar />-->
        </div>
        <ActionBar />
    </div>

    {#if $visibilityStore == false && $streamableCollectionStore.size > 0}
        <PictureInPicture />
    {/if}

    {#if $actionsMenuStore}
        <ActionsMenu />
    {/if}

    {#if $silentStore}
        <SilentBlock />
    {/if}

    <Lazy
        on:onload={() => emoteDataStoreLoading.set(true)}
        on:loaded={() => emoteDataStoreLoading.set(false)}
        on:error={() => emoteDataStoreLoading.set(false)}
        when={$emoteMenuStore}
        component={() => import("./EmoteMenu/EmoteMenu.svelte")}
    />
</div>

<style lang="scss">
    @import "../style/breakpoints.scss";

    .popups {
        z-index: 1000;
        .popupwrapper {
            &:not(:first-child) {
                @apply absolute w-full h-full overflow-hidden rounded-lg transition-all duration-300;
            }
            &:first-child {
                @apply relative;
                z-index: 505;
            }
            &:nth-child(n + 5) {
                /* Hide popups after 4 popups */
                @apply hidden;
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
