<script lang="ts">
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MicrophoneCloseSvg from "../images/microphone-close.svg";
    import banUserSvg from "../images/ban-user.svg";
    import NoVideoSvg from "../images/no-video.svg";
    import PinSvg from "../images/pin.svg";
    //import BubbleTalkPng from "../images/bubble-talk.png";
    import { LL } from "../../../i18n/i18n-svelte";
    import { requestVisitCardsStore, userIsAdminStore } from "../../Stores/GameStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { Streamable } from "../../Stores/StreamableCollectionStore";
    import { SpaceUserExtended } from "../../Space/SpaceFilter/SpaceFilter";
    import { peerStore } from "../../Stores/PeerStore";
    import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
    import { IconAlertTriangle, IconUser } from "@wa-icons";

    export let embedScreen: Streamable;
    export let spaceUser: SpaceUserExtended;
    export let videoEnabled: boolean;
    export let onClose: () => void;

    let moreActionOpened = false;

    function muteAudio(spaceUser: SpaceUserExtended) {
        analyticsClient.muteMicrophoneMeetingAction();
        spaceUser.emitPrivateEvent({
            $case: "muteAudio",
            muteAudio: {
                force: false, // This is going to be overwritten by the processor of muteAudio in the back
            },
        });
        close();
    }

    function muteAudioEveryBody(spaceUser: SpaceUserExtended) {
        analyticsClient.muteMicrophoneEverybodyMeetingAction();
        spaceUser.space.emitPublicMessage({
            $case: "muteAudioForEverybody",
            muteAudioForEverybody: {},
        });
        close();
    }

    function muteVideo(spaceUser: SpaceUserExtended) {
        analyticsClient.muteVideoMeetingAction();
        spaceUser.emitPrivateEvent({
            $case: "muteVideo",
            muteVideo: {
                force: false, // This is going to be overwritten by the processor of muteVideo in the back
            },
        });
        close();
    }

    function muteVideoEveryBody(spaceUser: SpaceUserExtended) {
        analyticsClient.muteVideoEverybodyMeetingAction();
        spaceUser.space.emitPublicMessage({
            $case: "muteVideoForEverybody",
            muteVideoForEverybody: {},
        });
        close();
    }

    /**
     * TODO: implement ban user
     */
    /*function ban() {
        trackStreamWrapper.ban();
    }*/

    function kickoff(spaceUser: SpaceUserExtended) {
        analyticsClient.kickoffMeetingAction();
        spaceUser.emitPrivateEvent({
            $case: "kickOffUser",
            kickOffUser: {},
        });
        // FIXME: this works only in bubbles
        // extract the user id from the space user id (spaceUserId = roomId + "_" + userId)
        const spaceUserId = spaceUser.spaceUserId;
        const userId = Number(spaceUserId.split("_").pop());

        peerStore.removePeer(userId);
        close();
    }

    function pin() {
        analyticsClient.pinMeetingAction();
        if (videoEnabled) {
            highlightedEmbedScreen.toggleHighlight(embedScreen);
            embedScreenLayoutStore.set(LayoutMode.Presentation);
        }
        close();
    }

    /*function sendPrivateMessage() {
        console.info("Not implemented yet");
    }*/

    function toggleActionMenu(value: boolean) {
        moreActionOpened = value;
    }

    function openBlockOrReportPopup(spaceUser: SpaceUserExtended) {
        analyticsClient.reportMeetingAction();
        showReportScreenStore.set({ userUuid: spaceUser.uuid, userName: spaceUser.name });
        close();
    }

    function visitCard(spaceUser: SpaceUserExtended) {
        analyticsClient.sendPrivateMessageMeetingAction();
        requestVisitCardsStore.set(spaceUser.visitCardUrl ?? null);
        close();
    }

    function close() {
        onClose();
    }
</script>

<div
    class="flex flex-col p-1 w-48 bg-contrast/80 backdrop-blur-md bg-opacity-10 rounded-md max-h-max z-50 cursor-pointer select-none"
    class:mt-[0.2rem]={!videoEnabled}
    on:click={() => analyticsClient.moreActionMetting()}
    on:click|preventDefault|stopPropagation={() => toggleActionMenu(!moreActionOpened)}
    role="button"
    tabindex="0"
    on:keydown={() => toggleActionMenu(!moreActionOpened)}
    on:mouseleave={() => close()}
>
    <!-- Pin -->
    {#if videoEnabled}
        <button
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
            on:click|preventDefault|stopPropagation={() => pin()}
        >
            <img src={PinSvg} class="w-4 h-4" alt="" />
            {$LL.camera.menu.pin()}
        </button>
    {/if}

    <!-- Mute audio user -->
    <button
        class="action-button mute-audio-user flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
        on:click|preventDefault|stopPropagation={() => muteAudio(spaceUser)}
    >
        <img src={MicrophoneCloseSvg} class="w-4 h-4" alt="" />
        {$LL.camera.menu.muteAudioUser()}
    </button>

    <!-- Mute audio every body -->
    {#if $userIsAdminStore}
        <button
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
            on:click|preventDefault|stopPropagation={() => muteAudioEveryBody(spaceUser)}
        >
            <img src={MicrophoneCloseSvg} class="w-4 h-4" alt="" />
            {$LL.camera.menu.muteAudioEveryBody()}
        </button>
    {/if}

    <!-- Mute video -->
    <button
        id="mute-video-user"
        class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
        on:click|preventDefault|stopPropagation={() => muteVideo(spaceUser)}
    >
        <img src={NoVideoSvg} class="w-4 h-4" alt="" />
        {$LL.camera.menu.muteVideoUser()}
    </button>

    <!-- Mute video every body -->
    {#if $userIsAdminStore}
        <button
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
            on:click|preventDefault|stopPropagation={() => muteVideoEveryBody(spaceUser)}
        >
            <img src={NoVideoSvg} class="w-4 h-4" alt="" />
            {$LL.camera.menu.muteVideoEveryBody()}
        </button>
    {/if}

    <!-- Kickoff user -->
    {#if $userIsAdminStore}
        <button
            id="kickoff-user"
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
            on:click|preventDefault|stopPropagation={() => kickoff(spaceUser)}
        >
            <img src={banUserSvg} class="w-4 h-4" alt="" />
            {$LL.camera.menu.kickoffUser()}
        </button>
    {/if}

    <!-- Send private message -->
    <!--    <button-->
    <!--        class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"-->
    <!--        on:click={() => analyticsClient.sendPrivateMessageMeetingAction()}-->
    <!--        on:click|preventDefault|stopPropagation={() => sendPrivateMessage()}-->
    <!--    >-->
    <!--        <img src={BubbleTalkPng} class="w-8 h-8" alt="" />-->
    <!--        <Tooltip text={$LL.camera.menu.senPrivateMessage()} rightPosition="true" />-->
    <!--    </button>-->

    <!-- Show visit card-->
    {#if spaceUser.visitCardUrl}
        <button
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
            on:click={() => analyticsClient.sendPrivateMessageMeetingAction()}
            on:click={() => close()}
            on:click|preventDefault|stopPropagation={() => visitCard(spaceUser)}
        >
            <IconUser />
            {$LL.chat.menu.visitCard()}
        </button>
    {/if}
    <!-- Block or report user -->
    <button
        class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left text-white"
        on:click|preventDefault|stopPropagation={() => openBlockOrReportPopup(spaceUser)}
    >
        <IconAlertTriangle />
        {$LL.camera.menu.blockOrReportUser()}
    </button>
</div>

<style lang="scss">
</style>
