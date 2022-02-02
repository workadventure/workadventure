<script lang="typescript">
    import { onMount } from "svelte";
    import { audioManagerVisibilityStore } from "../Stores/AudioManagerStore";
    import { embedScreenLayout, hasEmbedScreen } from "../Stores/EmbedScreensStore";
    import { emoteMenuStore } from "../Stores/EmoteStore";
    import { myCameraVisibilityStore } from "../Stores/MyCameraStoreVisibility";
    import { requestVisitCardsStore } from "../Stores/GameStore";
    import { helpCameraSettingsVisibleStore } from "../Stores/HelpCameraSettingsStore";
    import { layoutManagerActionVisibilityStore } from "../Stores/LayoutManagerStore";
    import { menuIconVisiblilityStore, menuVisiblilityStore, warningContainerStore } from "../Stores/MenuStore";
    import { showReportScreenStore, userReportEmpty } from "../Stores/ShowReportScreenStore";
    import AudioManager from "./AudioManager/AudioManager.svelte";
    import CameraControls from "./CameraControls.svelte";
    import EmbedScreensContainer from "./EmbedScreens/EmbedScreensContainer.svelte";
    import EmoteMenu from "./EmoteMenu/EmoteMenu.svelte";
    import HelpCameraSettingsPopup from "./HelpCameraSettings/HelpCameraSettingsPopup.svelte";
    import LayoutActionManager from "./LayoutActionManager/LayoutActionManager.svelte";
    import Menu from "./Menu/Menu.svelte";
    import MenuIcon from "./Menu/MenuIcon.svelte";
    import MyCamera from "./MyCamera.svelte";
    import ReportMenu from "./ReportMenu/ReportMenu.svelte";
    import VisitCard from "./VisitCard/VisitCard.svelte";
    import WarningContainer from "./WarningContainer/WarningContainer.svelte";
    import { isMediaBreakpointDown, isMediaBreakpointUp } from "../Utils/BreakpointsUtils";
    import CoWebsitesContainer from "./EmbedScreens/CoWebsitesContainer.svelte";
    import FollowMenu from "./FollowMenu/FollowMenu.svelte";
    import { followStateStore } from "../Stores/FollowStore";
    import { peerStore } from "../Stores/PeerStore";
    import { banMessageStore } from "../Stores/TypeMessageStore/BanMessageStore";
    import BanMessageContainer from "./TypeMessage/BanMessageContainer.svelte";
    import { textMessageStore } from "../Stores/TypeMessageStore/TextMessageStore";
    import TextMessageContainer from "./TypeMessage/TextMessageContainer.svelte";
    import { soundPlayingStore } from "../Stores/SoundPlayingStore";
    import AudioPlaying from "./UI/AudioPlaying.svelte";
    import { showLimitRoomModalStore, showShareLinkMapModalStore } from "../Stores/ModalStore";
    import LimitRoomModal from "./Modal/LimitRoomModal.svelte";
    import ShareLinkMapModal from "./Modal/ShareLinkMapModal.svelte";
    import { LayoutMode } from "../WebRtc/LayoutManager";
    import { actionsMenuStore } from "../Stores/ActionsMenuStore";
    import ActionsMenu from "./ActionsMenu/ActionsMenu.svelte";

    let mainLayout: HTMLDivElement;

    let displayCoWebsiteContainerMd = isMediaBreakpointUp("md");
    let displayCoWebsiteContainerLg = isMediaBreakpointDown("lg");

    const resizeObserver = new ResizeObserver(() => {
        displayCoWebsiteContainerMd = isMediaBreakpointUp("md");
        displayCoWebsiteContainerLg = isMediaBreakpointDown("lg");
    });

    onMount(() => {
        resizeObserver.observe(mainLayout);
    });
</script>

<div id="main-layout" bind:this={mainLayout}>
    <aside id="main-layout-left-aside">
        {#if $menuIconVisiblilityStore}
            <MenuIcon />
        {/if}

        {#if $embedScreenLayout === LayoutMode.VideoChat || displayCoWebsiteContainerMd}
            <CoWebsitesContainer vertical={true} />
        {/if}
    </aside>

    <section id="main-layout-main">
        {#if $menuVisiblilityStore}
            <Menu />
        {/if}

        {#if $banMessageStore.length > 0}
            <BanMessageContainer />
        {:else if $textMessageStore.length > 0}
            <TextMessageContainer />
        {/if}

        {#if $soundPlayingStore}
            <AudioPlaying url={$soundPlayingStore} />
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

        {#if $audioManagerVisibilityStore}
            <AudioManager />
        {/if}

        {#if $showLimitRoomModalStore}
            <LimitRoomModal />
        {/if}

        {#if $showShareLinkMapModalStore}
            <ShareLinkMapModal />
        {/if}

        {#if $followStateStore !== "off" || $peerStore.size > 0}
            <FollowMenu />
        {/if}

        {#if $actionsMenuStore}
            <ActionsMenu />
        {/if}

        {#if $requestVisitCardsStore}
            <VisitCard visitCardUrl={$requestVisitCardsStore} />
        {/if}

        {#if $emoteMenuStore}
            <EmoteMenu />
        {/if}

        {#if hasEmbedScreen}
            <EmbedScreensContainer />
        {/if}
    </section>

    <section id="main-layout-baseline">
        {#if displayCoWebsiteContainerLg}
            <CoWebsitesContainer />
        {/if}

        {#if $layoutManagerActionVisibilityStore}
            <LayoutActionManager />
        {/if}

        {#if $myCameraVisibilityStore}
            <MyCamera />
            <CameraControls />
        {/if}
    </section>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    #main-layout {
        display: grid;
        grid-template-columns: 120px calc(100% - 120px);
        grid-template-rows: 80% 20%;

        &-left-aside {
            min-width: 80px;
        }

        &-baseline {
            grid-column: 1/3;
        }
    }

    @include media-breakpoint-up(md) {
        #main-layout {
            grid-template-columns: 15% 85%;

            &-left-aside {
                min-width: auto;
            }
        }
    }

    @include media-breakpoint-up(sm) {
        #main-layout {
            grid-template-columns: 20% 80%;
        }
    }
</style>
