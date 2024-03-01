<script lang="ts">
    import { onMount } from "svelte";
    // import { audioManagerVisibilityStore } from "../Stores/AudioManagerStore";
    // import { hasEmbedScreen } from "../Stores/EmbedScreensStore";
    import { emoteDataStoreLoading, emoteMenuStore } from "../Stores/EmoteStore";
    import { requestVisitCardsStore } from "../Stores/GameStore";
    import { helpCameraSettingsVisibleStore, helpWebRtcSettingsVisibleStore } from "../Stores/HelpSettingsStore";
    import { helpSettingsPopupBlockedStore } from "../Stores/HelpSettingsPopupBlockedStore";
    // import { handleChange, layoutManagerActionVisibilityStore } from "../Stores/LayoutManagerStore";
    import { menuVisiblilityStore, warningContainerStore } from "../Stores/MenuStore";
    import { showReportScreenStore, userReportEmpty } from "../Stores/ShowReportScreenStore";
    // import { followStateStore } from "../Stores/FollowStore";

    // import { peerStore } from "../Stores/PeerStore";
    import { banMessageStore } from "../Stores/TypeMessageStore/BanMessageStore";
    import { textMessageStore } from "../Stores/TypeMessageStore/TextMessageStore";
    import { soundPlayingStore } from "../Stores/SoundPlayingStore";
    import {
        showLimitRoomModalStore,
        modalVisibilityStore,
        // showModalGlobalComminucationVisibilityStore,
        modalPopupVisibilityStore,
        // roomListVisibilityStore,
    } from "../Stores/ModalStore";
    import { actionsMenuStore } from "../Stores/ActionsMenuStore";
    import { showDesktopCapturerSourcePicker } from "../Stores/ScreenSharingStore";
    import { uiWebsitesStore } from "../Stores/UIWebsiteStore";
    import { coWebsites } from "../Stores/CoWebsiteStore";
    import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";
    import { proximityMeetingStore } from "../Stores/MyMediaStore";
    import { notificationPlayingStore } from "../Stores/NotificationStore";
    // import { askDialogStore } from "../Stores/MeetingStore";
    // import AudioManager from "./AudioManager/AudioManager.svelte";
    import { popupStore } from "../Stores/PopupStore";
    import { askDialogStore } from "../Stores/MeetingStore";
    // import { mapExplorationObjectSelectedStore } from "../Stores/MapEditorStore";
    // import AudioManager from "./AudioManager/AudioManager.svelte";
    import ActionBar from "./ActionBar/ActionBar.svelte";
    // import EmbedScreensContainer from "./EmbedScreens/EmbedScreensContainer.svelte";
    import HelpCameraSettingsPopup from "./HelpSettings/HelpCameraSettingsPopup.svelte";
    import HelpWebRtcSettingsPopup from "./HelpSettings/HelpWebRtcSettingsPopup.svelte";
    // import LayoutManagerStore from "../Stores/LayoutManagerStore";
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
    // import { JitsiBroadcastSpace } from "../Streaming/Jitsi/JitsiBroadcastSpace";
    // import { JitsiConferenceWrapper } from "../Streaming/Jitsi/JitsiConferenceWrapper";
    // import PopUpJitsi from "./PopUp/PopUpJitsi.svelte";
    // import PopUpTutorial from "./PopUp/PopUpJitsi.svelte";
    // import PopUpMessage from "./PopUp/PopUpMessage.svelte";
    // import PopUpSound from "./PopUp/PopUpJitsi.svelte";
    // import PopUpFollow from "./PopUp/PopUpFollow.svelte";
    // import JitsiTrack from "../Streaming/Jitsi/JitsiTrackWrapper";
    import Notification from "./UI/Notification.svelte";
    import MuteDialogBox from "./Video/AskedAction/MuteDialogBox.svelte";
    import { layoutManagerActionVisibilityStore } from "../Stores/LayoutManagerStore";
    import LayoutActionManager from "./LayoutActionManager/LayoutActionManager.svelte";
    // import PopUpMessage from "./PopUp/PopUpMessage.svelte";
    // import PopUpTutorial from "./PopUp/PopUpTutorial.svelte";
    // import PopUpSound from "./PopUp/PopUpSound.svelte";
    // import PopUpFollow from "./PopUp/PopUpFollow.svelte";
    // import PopUpJitsi from "./PopUp/PopUpJitsi.svelte";
    // import { all } from "axios";
    // import { add } from "lodash";
    // import { pop } from "@sentry/browser/types/transports/offline";
    // import { log } from "console";
    // import { UserInputManager } from "../Phaser/UserInput/UserInputManager";



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

        <!-- {#if hasEmbedScreen}
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


    <div class="popups">
        {#each $popupStore as popup, index (popup.uuid)}
            <div class="popupwrapper {index === 0 ? 'popup1' : index === 1 ? 'popup2' : index === 2 ? 'popup3' : index === 3 ? 'popup4' : index === 4 ? 'popup5' : ''}">
                <svelte:component this={popup.component} {...popup.props} on:close={() => popupStore.removePopup(popup.uuid)} />
                <!--{#if index === 3}
                    <button class="btn btn-secondary w-1/2 justify-center" on:click={() => popupStore.removePopup(popup.uuid)}>Close</button>
                {/if}
                {#if index === 4}
                    <button class="btn btn-secondary w-1/2 justify-center" on:click={() => popupStore.removePopup(popup.uuid)}>Close</button>

                {/if} -->
            </div>
        {/each}
    </div>

          {#if $actionsMenuStore}
              <ActionsMenu />
          {/if}


          <ActionBar />




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

    .popup1 {
        z-index: 505;
    }

    .popup2 {
        top: 77%;
        z-index: 504;
        transform: translate(-50%, -50%) scale(0.95);
        filter: blur(2px);
    }

    .popup3 {
        top: 74%;
        z-index: 503;
        transform: translate(-50%, -50%) scale(0.9);
        filter: blur(4px);
    }

    .popup4 {
        top: 77%; // voir pour les popups plus grandes
        z-index: 502;
        transform: translate(-50%, -50%) scale(0.9);
        filter: blur(4px);
    }

    .popup5 {
        top: 72%; // voir pour les popups plus grandes
        z-index: 501;
        transform: translate(-50%, -50%) scale(0.9);
        filter: blur(4px);
    }
</style>
