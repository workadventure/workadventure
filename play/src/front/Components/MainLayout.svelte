<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
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
    import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../Stores/ActionsCamStore";
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import { chatSidebarWidthStore } from "../Chat/ChatSidebarWidthStore";
    import { EditorToolName } from "../Phaser/Game/MapEditor/MapEditorModeManager";
    import { streamableCollectionStore } from "../Stores/StreamableCollectionStore";
    import { inputFormFocusStore } from "../Stores/UserInputStore";
    import { mapEditorSideBarWidthStore } from "./MapEditor/MapEditorSideBarWidthStore";
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
    import ExplorerMenu from "./ActionsMenu/ExplorerMenu.svelte";

    const handleFocusInEvent = (event: FocusEvent) => {
        if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement ||
            event.target instanceof HTMLSelectElement ||
            (event.target instanceof HTMLDivElement &&
                (event.target.getAttribute("role") === "textbox" ||
                    event.target.classList.contains("block-user-action") ||
                    event.target.getAttribute("contenteditable") === "true"))
        ) {
            inputFormFocusStore.set(true);
        }
    };

    const handleFocusOutEvent = (event: FocusEvent) => {
        if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement ||
            event.target instanceof HTMLSelectElement ||
            (event.target instanceof HTMLDivElement &&
                (event.target.getAttribute("role") === "textbox" ||
                    event.target.classList.contains("block-user-action") ||
                    event.target.getAttribute("contenteditable") === "true"))
        ) {
            inputFormFocusStore.set(false);
        }
    };

    onMount(() => {
        document.addEventListener("focusin", handleFocusInEvent);
        document.addEventListener("focusout", handleFocusOutEvent);
    });

    onDestroy(() => {
        document.removeEventListener("focusin", handleFocusInEvent);
        document.removeEventListener("focusout", handleFocusOutEvent);
        inputFormFocusStore.set(false);
    });

    $: marginLeft = $chatVisibilityStore ? $chatSidebarWidthStore : 0;
    $: marginRight =
        $mapEditorVisibilityStore && $mapEditorSelectedToolStore !== EditorToolName.WAMSettingsEditor
            ? $mapEditorSideBarWidthStore
            : 0;
</script>

<!-- Components ordered by z-index -->
<div
    id="main-layout"
    class="@container/main-layout absolute h-full w-full pointer-events-none z-10 {[...$coWebsites.values()].length ===
    0
        ? 'not-cowebsite'
        : ''}"
    style="padding-inline-start : {marginLeft}px; padding-inline-end: {marginRight}px "
>
    {#if $modalVisibilityStore}
        <div class="bg-black/60 w-full h-full fixed start-0 end-0" />
    {/if}

    {#if $highlightedEmbedScreen && $highlightFullScreen}
        <div class="w-full h-full fixed start-0 end-0 z-[310]">
            <MediaBox videoBox={$highlightedEmbedScreen} isHighlighted={true} />
        </div>
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

            <!-- Because of a bug in PIP, new content cannot play sound (it does not inherit UserActivation) -->
            <!-- So we need to split the audio playing (played in the main frame) from the video streams (that can be embedded in PiP) -->
            {#each [...$streamableCollectionStore.values()] as videoBox (videoBox.uniqueId)}
                <AudioStreamWrapper {videoBox} />
            {/each}

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
            {#if $requestVisitCardsStore || $wokaMenuStore || $actionsMenuStore}
                <div
                    transition:fly={{ x: 210, duration: 500 }}
                    class="absolute bottom-0 w-full h-fit max-h-[calc(100dvh-100px)] md:top-0 md:right-0 md:w-fit flex flex-col gap-2 items-end justify-start p-0 m-0 mr-3 overflow-y-auto no-scroll-bar"
                >
                    {#if $requestVisitCardsStore}
                        <VisitCard visitCardUrl={$requestVisitCardsStore} />
                    {/if}
                    {#if $wokaMenuStore}
                        <WokaMenu />
                    {/if}
                    {#if $actionsMenuStore}
                        <ActionsMenu />
                    {/if}
                </div>
            {/if}
            <ExternalComponents zone="centeredPopup" />

            <ExplorerMenu />
        </section>
        <div class="">
            <!--<ActionBar />-->
        </div>
        <ActionBar />
    </div>
</div>

<style lang="scss">
    @use "../style/breakpoints.scss" as *;

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

    .no-scroll-bar {
        max-width: calc(100% + 15px);
    }
    .no-scroll-bar::-webkit-scrollbar {
        display: none;
    }
    .no-scroll-bar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
