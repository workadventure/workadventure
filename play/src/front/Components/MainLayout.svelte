<script lang="ts">
    import { onMount } from "svelte";
    import { emoteDataStoreLoading, emoteMenuStore } from "../Stores/EmoteStore";
    import { requestVisitCardsStore } from "../Stores/GameStore";
    import { helpCameraSettingsVisibleStore, helpWebRtcSettingsVisibleStore } from "../Stores/HelpSettingsStore";
    import { helpSettingsPopupBlockedStore } from "../Stores/HelpSettingsPopupBlockedStore";
    import { menuVisiblilityStore, warningContainerStore } from "../Stores/MenuStore";
    import { showReportScreenStore, userReportEmpty } from "../Stores/ShowReportScreenStore";
    import { banMessageStore } from "../Stores/TypeMessageStore/BanMessageStore";
    import { textMessageStore } from "../Stores/TypeMessageStore/TextMessageStore";
    import { soundPlayingStore } from "../Stores/SoundPlayingStore";
    import {
        showLimitRoomModalStore,
        modalVisibilityStore,
        modalPopupVisibilityStore,
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
    import ActionBar from "./ActionBar/ActionBar.svelte";
    import HelpCameraSettingsPopup from "./HelpSettings/HelpCameraSettingsPopup.svelte";
    import HelpWebRtcSettingsPopup from "./HelpSettings/HelpWebRtcSettingsPopup.svelte";
    import Menu from "./Menu/Menu.svelte";
    import ReportMenu from "./ReportMenu/ReportMenu.svelte";
    import VisitCard from "./VisitCard/VisitCard.svelte";
    import WarningContainer from "./WarningContainer/WarningContainer.svelte";
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
    import { layoutManagerActionVisibilityStore } from "../Stores/LayoutManagerStore";
    import LayoutActionManager from "./LayoutActionManager/LayoutActionManager.svelte";

    let mainLayout: HTMLDivElement;
    export let message: string;

    let isMobile = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
    });

    onMount(() => {
        resizeObserver.observe(mainLayout);
        // ...
    });


</script>

<!-- Components ordered by z-index -->
<!-- svelte-ignore missing-declaration -->
<div id="main-layout" class="relative z-10 h-screen pointer-events-none {[...$coWebsites.values()].length === 0 ? 'not-cowebsite' : ''}" bind:this={mainLayout}>
    {#if $modalVisibilityStore || $modalPopupVisibilityStore}
        <div class="bg-black/60 w-full h-full fixed left-0 right-0">

        </div>
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
            <div class="tw-flex tw-flex-col tw-absolute tw-w-auto tw-right-0">
                {#each [...$notificationPlayingStore.values()] as notification (notification.id)}
                    <Notification {notification} />
                {/each}
            </div>
        {/if}


        {#if $warningContainerStore}
            <WarningContainer />
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

        <!-- {#if $hasEmbedScreen}
            <EmbedScreensContainer />
        {/if} -->

        {#if $uiWebsitesStore}
            <UiWebsiteContainer />
        {/if}

        {#if $modalVisibilityStore}
            <Modal />
        {/if}
    </section>

    {#if $modalVisibilityStore}
        <Modal />
    {/if}

    {#if $askDialogStore}
        <MuteDialogBox />
    {/if}

    {#if $layoutManagerActionVisibilityStore}
        <LayoutActionManager />
    {/if}


    {#if $actionsMenuStore}
    <ActionsMenu />
    {/if}

    <ActionBar />
    <!-- svelte-ignore missing-declaration -->
    <div class="popups">
        {#each $popupStore.slice().reverse() as popup (popup.uuid)}
            <div class="popupwrapper">
                {#if $popupStore.length < 5}
                    <svelte:component this={popup.component} {...popup.props} on:close={() => popupStore.removePopup(popup.uuid)} /> <!-- A essayer limitage d'apparition 5 popups-->
                {:else}
                    {popup.uuid = "hidden"}
                {/if}
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

    //Essayer de calculer la hauteur par rapport au precedent

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
</style>
