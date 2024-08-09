<script lang="ts">
    import { emoteDataStoreLoading, emoteMenuStore } from "../Stores/EmoteStore";
    import { requestVisitCardsStore } from "../Stores/GameStore";
    import {
        helpCameraSettingsVisibleStore,
        helpNotificationSettingsVisibleStore,
        helpWebRtcSettingsVisibleStore,
    } from "../Stores/HelpSettingsStore";
    import { helpSettingsPopupBlockedStore } from "../Stores/HelpSettingsPopupBlockedStore";
    import { menuVisiblilityStore, warningBannerStore } from "../Stores/MenuStore";
    import { showReportScreenStore, userReportEmpty } from "../Stores/ShowReportScreenStore";
    import { banMessageStore } from "../Stores/TypeMessageStore/BanMessageStore";
    import { textMessageStore } from "../Stores/TypeMessageStore/TextMessageStore";
    import { soundPlayingStore } from "../Stores/SoundPlayingStore";
    import {
        modalVisibilityStore,
        roomListVisibilityStore,
        showLimitRoomModalStore,
        showModalGlobalComminucationVisibilityStore,
    } from "../Stores/ModalStore";
    import { actionsMenuStore } from "../Stores/ActionsMenuStore";
    import { showDesktopCapturerSourcePicker } from "../Stores/ScreenSharingStore";
    import { uiWebsitesStore } from "../Stores/UIWebsiteStore";
    import { canvasHeight, canvasWidth, coWebsites } from "../Stores/CoWebsiteStore";
    import { proximityMeetingStore } from "../Stores/MyMediaStore";
    import { notificationPlayingStore } from "../Stores/NotificationStore";
    import { popupStore } from "../Stores/PopupStore";
    import { askDialogStore } from "../Stores/MeetingStore";
    import {
        bubbleModalVisibility,
        changeStatusConfirmationModalVisibility,
        notificationPermissionModalVisibility,
    } from "../Stores/AvailabilityStatusModalsStore";
    import { mapEditorAskToClaimPersonalAreaStore, mapExplorationObjectSelectedStore } from "../Stores/MapEditorStore";
    import { warningMessageStore } from "../Stores/ErrorStore";
    import { extensionActivateComponentModuleStore, extensionModuleStore } from "../Stores/GameSceneStore";
    import { gameManager } from "../Phaser/Game/GameManager";
    import { hasEmbedScreen } from "../Stores/EmbedScreensStore";
    import ActionBar from "./ActionBar/ActionBar.svelte";
    import HelpCameraSettingsPopup from "./HelpSettings/HelpCameraSettingsPopup.svelte";
    import HelpWebRtcSettingsPopup from "./HelpSettings/HelpWebRtcSettingsPopup.svelte";
    import HelpNotificationSettingsPopup from "./HelpSettings/HelpNotificationSettingPopup.svelte";
    import LayoutActionManager from "./LayoutActionManager/LayoutActionManager.svelte";
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
    import MuteDialogBox from "./Video/AskedAction/MuteDialogBox.svelte";
    import ChangeStatusConfirmationModal from "./ActionBar/AvailabilityStatus/Modals/ChangeStatusConfirmationModal.svelte";
    import BubbleConfirmationModal from "./ActionBar/AvailabilityStatus/Modals/BubbleConfirmationModal.svelte";
    import NotificationPermissionModal from "./ActionBar/AvailabilityStatus/Modals/NotificationPermissionModal.svelte";
    import GlobalCommunicationModal from "./Modal/GlobalCommunicationModal.svelte";
    import ObjectDetails from "./Modal/ObjectDetails.svelte";
    import MapList from "./Exploration/MapList.svelte";
    import WarningToast from "./WarningContainer/WarningToast.svelte";
    import ClaimPersonalAreaDialogBox from "./MapEditor/ClaimPersonalAreaDialogBox.svelte";
    import MainModal from "./Modal/MainModal.svelte";

    let mainLayout: HTMLDivElement;
    import EmbedScreensContainer from "./EmbedScreens/EmbedScreensContainer.svelte";

    window.addEventListener("resize", () => {
        if ($coWebsites.length < 1) {
            canvasWidth.set(window.innerWidth);
            canvasHeight.set(window.innerHeight);
        }
    });
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

    <div class="flex flex-col min-h-screen sm:flex-col-reverse">
        <section id="main-layout-main" class="pb-0 flex-1 pointer-events-none h-full w-full">
            <div class="popups">
                {#each $popupStore.slice().reverse() as popup (popup.uuid)}
                    <div class="popupwrapper">
                        <svelte:component
                            this={popup.component}
                            {...popup.props}
                            on:close={() => popupStore.removePopup(popup.uuid)}
                        />
                    </div>
                {/each}
            </div>

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
                <div class="flex flex-col absolute w-auto right-0">
                    {#each [...$notificationPlayingStore.values()] as notification (notification.id)}
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

            {#if $soundPlayingStore}
                <AudioPlaying url={$soundPlayingStore} />
            {/if}

            {#if $showLimitRoomModalStore}
                <LimitRoomModal />
            {/if}

            {#if $requestVisitCardsStore}
                <VisitCard visitCardUrl={$requestVisitCardsStore} />
            {/if}

            {#if $hasEmbedScreen}
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

            {#if $mapExplorationObjectSelectedStore}
                <ObjectDetails />
            {/if}

            {#if $modalVisibilityStore}
                <MapList />
            {/if}

            {#if $warningMessageStore.length > 0}
                <WarningToast />
            {/if}

        {#if $extensionActivateComponentModuleStore}
            {#if $extensionModuleStore != undefined && $extensionModuleStore.components != undefined}
                {#each $extensionModuleStore.components() as ExternalModuleComponent, index (index)}
                    <svelte:component
                        this={ExternalModuleComponent}
                        synchronisationStatusStore={gameManager.getCurrentGameScene().extensionModule?.statusStore}
                        meetingSynchronised={gameManager.getCurrentGameScene().extensionModule?.meetingSynchronised}
                        calendarSynchronised={gameManager.getCurrentGameScene().extensionModule?.calendarSynchronised}
                        presenceSynchronised={gameManager.getCurrentGameScene().extensionModule?.presenceSynchronised}
                        on:checkmodulecynschronisation={() => {
                            if (
                                $extensionModuleStore != undefined &&
                                $extensionModuleStore.checkModuleSynschronisation != undefined
                            )
                                $extensionModuleStore.checkModuleSynschronisation();
                            extensionActivateComponentModuleStore.set(false);
                        }}
                        on:close={() => {
                            extensionActivateComponentModuleStore.set(false);
                        }}
                    />
                {/each}
            {/if}
        {/if}

        <MainModal />
        </section>
        <div class="">
            <ActionBar />
        </div>
    </div>

    {#if $actionsMenuStore}
        <ActionsMenu />
    {/if}

    <!-- svelte-ignore missing-declaration -->
    <div class="popups">
        {#each $popupStore.slice().reverse() as popup (popup.uuid)}
            <div class="popupwrapper">
                <svelte:component
                    this={popup.component}
                    {...popup.props}
                    on:close={() => popupStore.removePopup(popup.uuid)}
                />
            </div>
        {/each}
    </div>

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

    .popups {
        position: fixed;
        position: fixed;
        width: 100%;
        height: 100%;
    }

    .popupwrapper {
        position: absolute;
        top: 80%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .popupwrapper:nth-child(1) {
        z-index: 505;
    }

    .popupwrapper:nth-child(2) {
        top: 77%;
        transform: translate(-50%, -50%) scale(0.95);
        filter: blur(2px);
    }

    .popupwrapper:nth-child(3) {
        top: 74%;
        transform: translate(-50%, -50%) scale(0.9);
        filter: blur(4px);
    }

    .popupwrapper:nth-child(4) {
        top: 72%;
        transform: translate(-50%, -50%) scale(0.85);
        filter: blur(4px);
    }

    .popupwrapper:nth-child(5) {
        top: 68%;
        transform: translate(-50%, -50%) scale(0.8);
        filter: blur(4px);
    }

    .popupwrapper:nth-child(6),
    .popupwrapper:nth-child(7),
    .popupwrapper:nth-child(8),
    .popupwrapper:nth-child(9),
    .popupwrapper:nth-child(10),
    .popupwrapper:nth-child(11),
    .popupwrapper:nth-child(12),
    .popupwrapper:nth-child(13) {
        display: none;
    }

    #main-layout {
        container-type: size;
    }
</style>
