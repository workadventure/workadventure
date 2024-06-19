<script lang="ts">
    import { onMount } from "svelte";
    import { emoteDataStoreLoading, emoteMenuStore } from "../Stores/EmoteStore";
    import { requestVisitCardsStore } from "../Stores/GameStore";
    import { helpCameraSettingsVisibleStore, helpWebRtcSettingsVisibleStore } from "../Stores/HelpSettingsStore";
    import { helpSettingsPopupBlockedStore } from "../Stores/HelpSettingsPopupBlockedStore";
    import { menuVisiblilityStore, warningBannerStore } from "../Stores/MenuStore";
    import { showReportScreenStore, userReportEmpty } from "../Stores/ShowReportScreenStore";
    import { banMessageStore } from "../Stores/TypeMessageStore/BanMessageStore";
    import { textMessageStore } from "../Stores/TypeMessageStore/TextMessageStore";
    import { soundPlayingStore } from "../Stores/SoundPlayingStore";
    import { embedScreenLayoutStore, hasEmbedScreen } from "../Stores/EmbedScreensStore";
    import {
        showLimitRoomModalStore,
        modalVisibilityStore,
        modalPopupVisibilityStore,
        showModalGlobalComminucationVisibilityStore,
    } from "../Stores/ModalStore";
    import { actionsMenuStore } from "../Stores/ActionsMenuStore";
    import { showDesktopCapturerSourcePicker } from "../Stores/ScreenSharingStore";
    import { uiWebsitesStore } from "../Stores/UIWebsiteStore";
    import { coWebsites } from "../Stores/CoWebsiteStore";
    import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";
    import { proximityMeetingStore } from "../Stores/MyMediaStore";
    import { notificationPlayingStore } from "../Stores/NotificationStore";
    import { popupStore } from "../Stores/PopupStore";
    import { askDialogStore } from "../Stores/MeetingStore";
    import { mapExplorationObjectSelectedStore } from "../Stores/MapEditorStore";
    import { warningMessageStore } from "../Stores/ErrorStore";
    import ActionBar from "./ActionBar/ActionBar.svelte";
    import HelpCameraSettingsPopup from "./HelpSettings/HelpCameraSettingsPopup.svelte";
    import HelpWebRtcSettingsPopup from "./HelpSettings/HelpWebRtcSettingsPopup.svelte";
    import Menu from "./Menu/Menu.svelte";
    import ReportMenu from "./ReportMenu/ReportMenu.svelte";
    import VisitCard from "./VisitCard/VisitCard.svelte";
    import WarningBanner from "./WarningContainer/WarningBanner.svelte";
    import CoWebsitesContainer from "./EmbedScreens/CoWebsitesContainer.svelte";
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
    import GlobalCommunicationModal from "./Modal/GlobalCommunicationModal.svelte";
    import ObjectDetails from "./Modal/ObjectDetails.svelte";
    import Popup from "./Modal/Popup.svelte";
    import MapList from "./Exploration/MapList.svelte";
    import WarningToast from "./WarningContainer/WarningToast.svelte";
    import EmbedScreensContainer from "./EmbedScreens/EmbedScreensContainer.svelte";
    import { focusMode, toggleHighlightMode } from "../Stores/ActionsCamStore";

    let mainLayout: HTMLDivElement;
    // export let message: string;

    let isMobile = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
    });

    onMount(() => {
        resizeObserver.observe(mainLayout);
        // ...
    });

    $: $focusMode, setFocusMode();

    function setFocusMode() {
        console.log("je suis dans le set focusMode du main layout", $focusMode);
        if ($focusMode === true) {
            console.log("mainLayout", mainLayout);
            addFocusModeStyle();
        } else {
            removeFocusModeStyle();
        }
    }

    function addFocusModeStyle() {
        console.log("je suis dans le addDivForResize");
        const div = document.createElement("div");
        div.id = "focus-mode-active";
        div.style.backgroundColor = "blue";
        div.style.opacity = "0.5";
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.position = "absolute";
        div.style.top = "0";
        div.style.right = "0";
        div.style.zIndex = "10";
        document.body.appendChild(div);
    }

    function removeFocusModeStyle() {
        const div = document.getElementById("focus-mode-active");
        if (div) {
            div.remove();
        }
    }
</script>

<!-- Components ordered by z-index -->
<div
    id="main-layout"
    class="@container/main-layout relative flex flex-col z-10 pointer-events-none h-screen index{[
        ...$coWebsites.values(),
    ].length === 0
        ? 'not-cowebsite'
        : ''}"
    bind:this={mainLayout}
>
    <div class={$toggleHighlightMode ? "hidden" : "action-bar"}>
        <ActionBar />
    </div>

    {#if $modalVisibilityStore || $modalPopupVisibilityStore}
        <div class="bg-black/60 w-full h-full fixed left-0 right-0" />
    {/if}

    <aside id="main-layout-left-aside">
        <CoWebsitesContainer vertical={isMobile} />
    </aside>

    <section id="main-layout-main" class="pb-0 pointer-events-none">
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

        <div class="embed-screens-container">
            {#if $hasEmbedScreen}
                <EmbedScreensContainer />
            {/if}
        </div>
        {#if $uiWebsitesStore}
            <UiWebsiteContainer />
        {/if}

        {#if $modalVisibilityStore}
            <Modal />
        {/if}
        {#if $modalVisibilityStore}
            <Modal />
        {/if}

        {#if $askDialogStore}
            <MuteDialogBox />
        {/if}

        {#if $showModalGlobalComminucationVisibilityStore}
            <GlobalCommunicationModal />
        {/if}

        {#if $mapExplorationObjectSelectedStore}
            <ObjectDetails />
        {/if}

        {#if $modalPopupVisibilityStore}
            <Popup />
        {/if}

        {#if $modalVisibilityStore}
            <MapList />
        {/if}

        {#if $warningMessageStore.length > 0}
            <WarningToast />
        {/if}
    </section>

    {#if $actionsMenuStore}
        <ActionsMenu />
    {/if}

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
        position: relative;
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

    .action-bar {
        z-index: 10;
    }
    .index {
        z-index: 50;
    }
    .embed-screens-container {
        position: relative;
        z-index: 0;
    }
</style>
