<script lang="ts">
    import { fly } from "svelte/transition";
    import { afterUpdate, onDestroy, onMount } from "svelte";
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
    import { showRecordingList } from "../Stores/RecordingStore";
    import { toastStore } from "../Stores/ToastStore";
    import { meetingInvitationRequestStore } from "../Stores/MeetingInvitationStore";
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
    import RecordingsListModal from "./PopUp/Recording/RecordingsListModal.svelte";
    import ProximityNotificationContainer from "./ProximityNotification/ProximityNotificationContainer.svelte";
    import MeetingInvitationPopup from "./MeetingInvitation/MeetingInvitationPopup.svelte";
    import ChevronLeftIcon from "./Icons/ChevronLeftIcon.svelte";

    /** When false, the right-hand participant strip in highlight fullscreen is collapsed (toggle with the edge arrow). */
    let highlightParticipantCamerasListOpen = true;

    const HIGHLIGHT_FULLSCREEN_PARTICIPANT_LIST_AUTO_HIDE_MS = 5000;

    let participantListAutoHideTimer: ReturnType<typeof setTimeout> | undefined;
    let wasHighlightFullscreenActive = false;

    /** On entering highlight fullscreen, show the list then auto-hide after 5s (uses existing slide animation). */
    afterUpdate(() => {
        const active = Boolean($highlightedEmbedScreen && $highlightFullScreen);
        if (active && !wasHighlightFullscreenActive) {
            highlightParticipantCamerasListOpen = true;
            if (participantListAutoHideTimer) {
                clearTimeout(participantListAutoHideTimer);
            }
            participantListAutoHideTimer = setTimeout(() => {
                highlightParticipantCamerasListOpen = false;
                participantListAutoHideTimer = undefined;
            }, HIGHLIGHT_FULLSCREEN_PARTICIPANT_LIST_AUTO_HIDE_MS);
        } else if (!active && wasHighlightFullscreenActive) {
            if (participantListAutoHideTimer) {
                clearTimeout(participantListAutoHideTimer);
                participantListAutoHideTimer = undefined;
            }
            highlightParticipantCamerasListOpen = true;
        }
        wasHighlightFullscreenActive = active;
    });

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
        if (participantListAutoHideTimer) {
            clearTimeout(participantListAutoHideTimer);
        }
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
            <MediaBox videoBox={$highlightedEmbedScreen} fullScreen={true} />
        </div>
        <!-- Fullscreen participant cameras list: slide + single edge toggle (same arrow, same spot) -->
        <div class="absolute top-0 right-0 z-[320] h-full w-[250px] pointer-events-none" aria-hidden="false">
            <div
                id="highlightFullScreenParticipantCamerasList"
                class="absolute inset-y-0 right-0 flex w-[250px] flex-col bg-contrast/50 backdrop-blur shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform"
                class:translate-x-full={!highlightParticipantCamerasListOpen}
                class:pointer-events-none={!highlightParticipantCamerasListOpen}
                class:pointer-events-auto={highlightParticipantCamerasListOpen}
            >
                <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                    {#each [...$streamableCollectionStore.values()] as videoBox (videoBox.uniqueId)}
                        {#if videoBox.uniqueId !== $highlightedEmbedScreen?.uniqueId}
                            <div class="h-[135px] w-full shrink-0">
                                <MediaBox {videoBox} fullScreen={false} miniMode={true} />
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>

            <button
                type="button"
                id="highlightFullScreenParticipantCamerasListToggle"
                class="pointer-events-auto absolute right-0 top-1/2 z-[321] flex h-16 w-10 -translate-y-1/2 items-center justify-center rounded-l-lg border border-white/10 border-e-0 bg-contrast/50 shadow-md backdrop-blur transition-colors duration-200 hover:bg-white/10"
                aria-expanded={highlightParticipantCamerasListOpen}
                aria-controls="highlightFullScreenParticipantCamerasList"
                aria-label={highlightParticipantCamerasListOpen ? "Hide participant list" : "Show participant list"}
                data-testid="toggle-highlight-participant-cameras-list"
                on:click={() => (highlightParticipantCamerasListOpen = !highlightParticipantCamerasListOpen)}
            >
                <span
                    class="inline-flex transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    class:rotate-180={highlightParticipantCamerasListOpen}
                >
                    <ChevronLeftIcon height="h-7" width="w-7" strokeWidth="2" />
                </span>
            </button>
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
            <ProximityNotificationContainer />
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

            {#if $toastStore.size > 0}
                <div class="absolute top-0 right-2 z-[999] flex flex-col gap-2 items-end">
                    {#each [...$toastStore.entries()] as toastEntry (toastEntry[0])}
                        {@const toast = toastEntry[1]}
                        <svelte:component this={toast.component} {...toast.props} />
                    {/each}
                </div>
            {/if}

            {#if $showRecordingList}
                <RecordingsListModal />
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
            {#if $requestVisitCardsStore || $wokaMenuStore || $actionsMenuStore || $meetingInvitationRequestStore}
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
                    {#if $meetingInvitationRequestStore}
                        <MeetingInvitationPopup />
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
