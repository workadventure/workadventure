<script lang="ts">
    import { writable } from "svelte/store";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MicrophoneCloseSvg from "../images/microphone-close.svg";
    import banUserSvg from "../images/ban-user.svg";
    import NoVideoSvg from "../images/no-video.svg";
    import PinSvg from "../images/pin.svg";
    //import BubbleTalkPng from "../images/bubble-talk.png";
    import { TrackStreamWrapperInterface } from "../../Streaming/Contract/TrackStreamWrapperInterface";
    import { LL } from "../../../i18n/i18n-svelte";
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import { userIsAdminStore } from "../../Stores/GameStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { Streamable } from "../../Stores/StreamableCollectionStore";
    import { SpaceUserExtended } from "../../Space/SpaceFilter/SpaceFilter";
    import { peerStore } from "../../Stores/PeerStore";
    import { IconAlertTriangle, IconUser } from "@wa-icons";

    export let embedScreen: Streamable;
    export let trackStreamWrapper: TrackStreamWrapperInterface;
    export let videoEnabled: boolean;

    let moreActionOpened = writable<boolean>(false);

    function muteAudio(spaceUser: SpaceUserExtended) {
        spaceUser.emitPrivateEvent({
            $case: "muteAudio",
            muteAudio: {
                force: false, // This is going to be overwritten by the processor of muteAudio in the back
            },
        });
    }

    function muteAudioEveryBody(spaceUser: SpaceUserExtended) {
        spaceUser.space.emitPublicMessage({
            $case: "muteAudioForEverybody",
            muteAudioForEverybody: {},
        });
    }

    function muteVideo(spaceUser: SpaceUserExtended) {
        spaceUser.emitPrivateEvent({
            $case: "muteVideo",
            muteVideo: {
                force: false, // This is going to be overwritten by the processor of muteVideo in the back
            },
        });
    }

    function muteVideoEveryBody(spaceUser: SpaceUserExtended) {
        spaceUser.space.emitPublicMessage({
            $case: "muteVideoForEverybody",
            muteVideoForEverybody: {},
        });
    }

    /**
     * TODO: implement ban user
     */
    /*function ban() {
        trackStreamWrapper.ban();
    }*/

    function kickoff(spaceUser: SpaceUserExtended) {
        spaceUser.emitPrivateEvent({
            $case: "kickOffUser",
            kickOffUser: {},
        });
        peerStore.removePeer(spaceUser.id);
    }

    function pin() {
        if (!videoEnabled) return;
        highlightedEmbedScreen.toggleHighlight(embedScreen);
        embedScreenLayoutStore.set(LayoutMode.Presentation);
    }

    /*function sendPrivateMessage() {
        console.info("Not implemented yet");
    }*/

    function toggleActionMenu(value: boolean) {
        moreActionOpened.set(value);
    }

    function openBlockOrReportPopup() {
        trackStreamWrapper.blockOrReportUser();
    }

    function visitCard() {
        console.info("Not implemented yet");
    }
</script>

<div
    class="absolute flex flex-col p-1 top-8 -right-36 w-48 bg-contrast/80 backdrop-blur-md bg-opacity-10 rounded-md max-h-max z-50 cursor-pointer"
    class:mt-[0.2rem]={!videoEnabled}
    on:click={() => analyticsClient.moreActionMetting()}
    on:click|preventDefault|stopPropagation={() => toggleActionMenu(!$moreActionOpened)}
    role="button"
    tabindex="0"
    on:keydown={() => toggleActionMenu(!$moreActionOpened)}
    on:mouseleave={() => toggleActionMenu(false)}
>
    {#await trackStreamWrapper.getExtendedSpaceUser()}
        <div />
    {:then spaceUser}
        <!-- Pin -->
        {#if videoEnabled}
            <button
                class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left"
                on:click={() => analyticsClient.pinMeetingAction()}
                on:click|preventDefault|stopPropagation={() => pin()}
            >
                <img src={PinSvg} class="w-4 h-4" alt="Ellipsis icon" />
                {$LL.camera.menu.pin()}
            </button>
        {/if}

        <!-- Mute audio user -->
        <button
            id="mute-audio-user"
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left"
            on:click={() => analyticsClient.muteMicrophoneMeetingAction()}
            on:click|preventDefault|stopPropagation={() => muteAudio(spaceUser)}
        >
            <img src={MicrophoneCloseSvg} class="w-4 h-4" alt="Ellipsis icon" />
            {$LL.camera.menu.muteAudioUser()}
        </button>

        <!-- Mute audio every body -->
        {#if $userIsAdminStore}
            <button
                class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left"
                on:click={() => analyticsClient.muteMicrophoneEverybodyMeetingAction()}
                on:click|preventDefault|stopPropagation={() => muteAudioEveryBody(spaceUser)}
            >
                <img src={MicrophoneCloseSvg} class="w-4 h-4" alt="Ellipsis icon" />
                {$LL.camera.menu.muteAudioEveryBody()}
            </button>
        {/if}

        <!-- Mute video -->
        <button
            id="mute-video-user"
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left"
            on:click={() => analyticsClient.muteVideoMeetingAction()}
            on:click|preventDefault|stopPropagation={() => muteVideo(spaceUser)}
        >
            <img src={NoVideoSvg} class="w-4 h-4" alt="Ellipsis icon" />
            {$LL.camera.menu.muteVideoUser()}
        </button>

        <!-- Mute video every body -->
        {#if $userIsAdminStore}
            <button
                class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left"
                on:click={() => analyticsClient.muteVideoEverybodyMeetingAction()}
                on:click|preventDefault|stopPropagation={() => muteVideoEveryBody(spaceUser)}
            >
                <img src={NoVideoSvg} class="w-4 h-4" alt="Ellipsis icon" />
                {$LL.camera.menu.muteVideoEveryBody()}
            </button>
        {/if}

        <!-- Kickoff user -->
        {#if $userIsAdminStore}
            <button
                id="kickoff-user"
                class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left"
                on:click={() => analyticsClient.kickoffMeetingAction()}
                on:click|preventDefault|stopPropagation={() => kickoff(spaceUser)}
            >
                <img src={banUserSvg} class="w-4 h-4" alt="Ellipsis icon" />
                {$LL.camera.menu.kickoffUser()}
            </button>
        {/if}

        <!-- Send private message -->
        <!--    <button-->
        <!--        class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"-->
        <!--        on:click={() => analyticsClient.sendPrivateMessageMeetingAction()}-->
        <!--        on:click|preventDefault|stopPropagation={() => sendPrivateMessage()}-->
        <!--    >-->
        <!--        <img src={BubbleTalkPng} class="w-8 h-8" alt="Ellipsis icon" />-->
        <!--        <Tooltip text={$LL.camera.menu.senPrivateMessage()} rightPosition="true" />-->
        <!--    </button>-->

        <!-- Show visit card-->
        <button
            class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left"
            on:click={() => analyticsClient.sendPrivateMessageMeetingAction()}
            on:click|preventDefault|stopPropagation={() => visitCard()}
        >
            <IconUser />
            {$LL.chat.menu.visitCard()}
        </button>

        <!-- Block or report user -->
        {#if trackStreamWrapper instanceof VideoPeer}
            <button
                class="action-button flex gap-2 items-center hover:bg-white/10 m-0 p-2 w-full text-sm rounded leading-4 text-left"
                on:click={() => analyticsClient.reportMeetingAction()}
                on:click|preventDefault|stopPropagation={() => openBlockOrReportPopup()}
            >
                <IconAlertTriangle />
                {$LL.camera.menu.blockOrReportUser()}
            </button>
        {/if}
    {/await}
</div>

<style lang="scss">
</style>
