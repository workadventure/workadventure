<script lang="ts">
    import { onMount } from "svelte";
    import { audioManagerVisibilityStore } from "../Stores/AudioManagerStore";
    import { hasEmbedScreen } from "../Stores/EmbedScreensStore";
    import { emoteDataStoreLoading, emoteMenuStore } from "../Stores/EmoteStore";
    import { requestVisitCardsStore } from "../Stores/GameStore";
    import {
        helpCameraSettingsVisibleStore,
        helpNotificationSettingsVisibleStore,
        helpWebRtcSettingsVisibleStore,
    } from "../Stores/HelpSettingsStore";
    import { helpSettingsPopupBlockedStore } from "../Stores/HelpSettingsPopupBlockedStore";
    import { layoutManagerActionVisibilityStore } from "../Stores/LayoutManagerStore";
    import { menuVisiblilityStore, warningBannerStore } from "../Stores/MenuStore";
    import { showReportScreenStore, userReportEmpty } from "../Stores/ShowReportScreenStore";
    import { followStateStore } from "../Stores/FollowStore";
    import { peerStore } from "../Stores/PeerStore";
    import { banMessageStore } from "../Stores/TypeMessageStore/BanMessageStore";
    import { textMessageStore } from "../Stores/TypeMessageStore/TextMessageStore";
    import { soundPlayingStore } from "../Stores/SoundPlayingStore";
    import {
        modalPopupVisibilityStore,
        modalVisibilityStore,
        roomListVisibilityStore,
        showLimitRoomModalStore,
        showModalGlobalComminucationVisibilityStore,
    } from "../Stores/ModalStore";
    import { actionsMenuStore } from "../Stores/ActionsMenuStore";
    import { showDesktopCapturerSourcePicker } from "../Stores/ScreenSharingStore";
    import { uiWebsitesStore } from "../Stores/UIWebsiteStore";
    import { coWebsites } from "../Stores/CoWebsiteStore";
    import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";
    import { proximityMeetingStore } from "../Stores/MyMediaStore";
    import { notificationPlayingStore } from "../Stores/NotificationStore";
    import { askDialogStore } from "../Stores/MeetingStore";
    import {
        bubbleModalVisibility,
        changeStatusConfirmationModalVisibility,
        notificationPermissionModalVisibility,
    } from "../Stores/AvailabilityStatusModalsStore";
    import { mapEditorAskToClaimPersonalAreaStore, mapExplorationObjectSelectedStore } from "../Stores/MapEditorStore";
    import { warningMessageStore } from "../Stores/ErrorStore";
    import AudioManager from "./AudioManager/AudioManager.svelte";
    import ActionBar from "./ActionBar/ActionBar.svelte";
    import EmbedScreensContainer from "./EmbedScreens/EmbedScreensContainer.svelte";
    import HelpCameraSettingsPopup from "./HelpSettings/HelpCameraSettingsPopup.svelte";
    import HelpWebRtcSettingsPopup from "./HelpSettings/HelpWebRtcSettingsPopup.svelte";
    import HelpNotificationSettingsPopup from "./HelpSettings/HelpNotificationSettingPopup.svelte";
    import LayoutActionManager from "./LayoutActionManager/LayoutActionManager.svelte";
    import Menu from "./Menu/Menu.svelte";
    import ReportMenu from "./ReportMenu/ReportMenu.svelte";
    import VisitCard from "./VisitCard/VisitCard.svelte";
    import WarningBanner from "./WarningContainer/WarningBanner.svelte";
    import CoWebsitesContainer from "./EmbedScreens/CoWebsitesContainer.svelte";
    import FollowMenu from "./FollowMenu/FollowMenu.svelte";
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
    import MuteDialogBox from "./Video/AskedAction/MuteDialogBox.svelte";
    import ChangeStatusConfirmationModal from "./ActionBar/AvailabilityStatus/Modals/ChangeStatusConfirmationModal.svelte";
    import BubbleConfirmationModal from "./ActionBar/AvailabilityStatus/Modals/BubbleConfirmationModal.svelte";
    import NotificationPermissionModal from "./ActionBar/AvailabilityStatus/Modals/NotificationPermissionModal.svelte";
    import GlobalCommunicationModal from "./Modal/GlobalCommunicationModal.svelte";
    import ObjectDetails from "./Modal/ObjectDetails.svelte";
    import MapList from "./Exploration/MapList.svelte";
    import WarningToast from "./WarningContainer/WarningToast.svelte";
    import ClaimPersonalAreaDialogBox from "./MapEditor/ClaimPersonalAreaDialogBox.svelte";
    import MapExplorerPopup from "./Modal/MapExplorerPopup.svelte";
    import MainModal from "./Modal/MainModal.svelte";

    let mainLayout: HTMLDivElement;

    let isMobile = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
    });

    onMount(() => {
        resizeObserver.observe(mainLayout);
    });
</script>

<!-- Components ordered by z-index -->
<div id="main-layout" class={[...$coWebsites.values()].length === 0 ? "not-cowebsite" : ""} bind:this={mainLayout}>
    {#if $modalVisibilityStore || $modalPopupVisibilityStore}
        <div class="tw-bg-black/60 tw-w-full tw-h-full tw-fixed tw-left-0 tw-right-0" />
    {/if}

    <aside id="main-layout-left-aside">
        <CoWebsitesContainer vertical={isMobile} />
    </aside>

    <section id="main-layout-main" class="tw-pb-0">
        <Lazy
            when={$showDesktopCapturerSourcePicker}
            component={() => import("./Video/DesktopCapturerSourcePicker.svelte")}
        />

        {#if $menuVisiblilityStore}
            <Menu />
        {/if}

        {#if $banMessageStore.length > 0}
            <BanMessageContainer />
        {:else if $textMessageStore.length > 0}
            <TextMessageContainer />
        {/if}

        {#if $notificationPlayingStore}
            <div class="tw-flex tw-flex-col tw-absolute tw-w-auto tw-right-0">
                {#each [...$notificationPlayingStore.values()] as notification (notification.id)}
                    <Notification {notification} />
                {/each}
            </div>
        {/if}

        {#if $soundPlayingStore}
            <AudioPlaying url={$soundPlayingStore} />
        {/if}

        {#if $warningBannerStore}
            <WarningBanner />
        {/if}

        {#if $showReportScreenStore !== userReportEmpty}
            <ReportMenu />
        {/if}

        {#if $helpCameraSettingsVisibleStore}
            <HelpCameraSettingsPopup />
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

        {#if $audioManagerVisibilityStore}
            <AudioManager />
        {/if}

        {#if $showLimitRoomModalStore}
            <LimitRoomModal />
        {/if}

        {#if $followStateStore !== "off" || $peerStore.size > 0}
            <FollowMenu />
        {/if}

        {#if $requestVisitCardsStore}
            <VisitCard visitCardUrl={$requestVisitCardsStore} />
        {/if}

        {#if hasEmbedScreen}
            <EmbedScreensContainer />
        {/if}

        {#if $uiWebsitesStore}
            <UiWebsiteContainer />
        {/if}

        {#if $modalVisibilityStore}
            <Modal />
        {/if}

        {#if $askDialogStore}
            <MuteDialogBox />
        {/if}

        {#if $mapEditorAskToClaimPersonalAreaStore}
            <ClaimPersonalAreaDialogBox />
        {/if}

        {#if $showModalGlobalComminucationVisibilityStore}
            <GlobalCommunicationModal />
        {/if}

        {#if $mapExplorationObjectSelectedStore}
            <ObjectDetails />
        {/if}

        {#if $modalPopupVisibilityStore}
            <MapExplorerPopup />
        {/if}
        {#if $roomListVisibilityStore}
            <MapList />
        {/if}
        {#if $warningMessageStore.length > 0}
            <WarningToast />
        {/if}

        <MainModal />
    </section>

    {#if $layoutManagerActionVisibilityStore}
        <LayoutActionManager />
    {/if}

    {#if $actionsMenuStore}
        <ActionsMenu />
    {/if}

    <ActionBar />

    {#if $changeStatusConfirmationModalVisibility}
        <ChangeStatusConfirmationModal />
    {/if}

    {#if $bubbleModalVisibility}
        <BubbleConfirmationModal />
    {/if}
    {#if $notificationPermissionModalVisibility}
        <NotificationPermissionModal />
    {/if}
    <!-- audio when user have a message TODO delete it with new chat -->
    <audio id="newMessageSound" src="/resources/objects/new-message.mp3" style="width: 0;height: 0;opacity: 0" />

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

    #main-layout {
        display: grid;
        grid-template-columns: 120px calc(100% - 120px);
        grid-template-rows: 100%;
        transition: all 0.2s ease-in-out;

        &-left-aside {
            min-width: 80px;
        }
    }

    @include media-breakpoint-up(md) {
        #main-layout {
            grid-template-columns: 15% 85%;

            &-left-aside {
                min-width: auto;
            }

            &.not-cowebsite {
                grid-template-columns: 0% 100%;
            }
        }
    }

    @include media-breakpoint-up(sm) {
        #main-layout {
            grid-template-columns: 20% 80%;

            &.not-cowebsite {
                grid-template-columns: 0% 100%;
            }
        }
    }
</style>
