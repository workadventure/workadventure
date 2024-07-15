<script lang="ts">
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MicrophoneCloseSvg from "../images/microphone-close.svg";
    import banUserSvg from "../images/ban-user.svg";
    import NoVideoSvg from "../images/no-video.svg";
    import PinSvg from "../images/pin.svg";
    import BubbleTalkPng from "../images/bubble-talk.png";
    import { TrackStreamWrapperInterface } from "../../Streaming/Contract/TrackStreamWrapperInterface";
    import Tooltip from "../Util/Tooltip.svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import { userIsAdminStore } from "../../Stores/GameStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { Streamable } from "../../Stores/StreamableCollectionStore";
    import reportImg from "./images/report.svg";

    export let embedScreen: Streamable;
    export let trackStreamWraper: TrackStreamWrapperInterface;
    export let videoEnabled: boolean;

    function muteAudio() {
        trackStreamWraper.muteAudioParticipant();
    }

    function muteAudioEveryBody() {
        trackStreamWraper.muteAudioEveryBody();
    }

    function muteVideo() {
        trackStreamWraper.muteVideoParticipant();
    }

    function muteVideoEveryBody() {
        trackStreamWraper.muteVideoEverybody();
    }

    /**
     * TODO: implement ban user
     */
    /*function ban() {
        trackStreamWraper.ban();
    }*/

    function kickoff() {
        trackStreamWraper.kickoff();
    }

    function pin() {
        if (!videoEnabled) return;
        highlightedEmbedScreen.toggleHighlight(embedScreen);
        embedScreenLayoutStore.set(LayoutMode.Presentation);
    }

    function sendPrivateMessage() {
        console.info("Not implemented yet");
    }

    function openBlockOrReportPopup() {
        trackStreamWraper.blockOrReportUser();
    }

    function visitCard() {
        console.info("Not implemented yet");
    }
</script>

<div class="flex h-full w-full">
    <!-- Pin -->
    {#if videoEnabled}
        <button
            id="pin"
            class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
            on:click={() => analyticsClient.pinMeetingAction()}
            on:click|preventDefault|stopPropagation={() => pin()}
        >
            <img src={PinSvg} class="w-4 h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.pin()} leftPosition="false" />
        </button>
    {/if}

    <!-- Mute audio user -->
    <button
        id="mute-audio-user"
        class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
        on:click={() => analyticsClient.muteMicrophoneMeetingAction()}
        on:click|preventDefault|stopPropagation={() => muteAudio()}
    >
        <img src={MicrophoneCloseSvg} class="w-4 h-4" alt="Ellipsis icon" />
        <Tooltip text={$LL.camera.menu.muteAudioUser()} leftPosition="false" />
    </button>

    <!-- Mute audio every body -->
    {#if $userIsAdminStore}
        <button
            id="mute-audio-everybody"
            class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
            on:click={() => analyticsClient.muteMicrophoneEverybodyMeetingAction()}
            on:click|preventDefault|stopPropagation={() => muteAudioEveryBody()}
        >
            <img src={MicrophoneCloseSvg} class="w-4 h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.muteAudioEveryBody()} leftPosition="true" />
        </button>
    {/if}

    <!-- Mute video -->
    <button
        id="mute-video-user"
        class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
        on:click={() => analyticsClient.muteVideoMeetingAction()}
        on:click|preventDefault|stopPropagation={() => muteVideo()}
    >
        <img src={NoVideoSvg} class="w-4 h-4" alt="Ellipsis icon" />
        <Tooltip text={$LL.camera.menu.muteVideoUser()} leftPosition="true" />
    </button>

    <!-- Mute video every body -->
    {#if $userIsAdminStore}
        <button
            id="mute-video-everybody"
            class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
            on:click={() => analyticsClient.muteVideoEverybodyMeetingAction()}
            on:click|preventDefault|stopPropagation={() => muteVideoEveryBody()}
        >
            <img src={NoVideoSvg} class="w-4 h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.muteVideoEveryBody()} leftPosition="true" />
        </button>
    {/if}

    <!-- Kickoff user -->
    {#if $userIsAdminStore}
        <button
            id="kickoff-user"
            class="action-button flex flex-row items-center justify-center p-0 ml-1 cursor-pointer"
            on:click={() => analyticsClient.kickoffMeetingAction()}
            on:click|preventDefault|stopPropagation={() => kickoff()}
        >
            <img src={banUserSvg} class="w-4 h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.kickoffUser()} leftPosition="true" />
        </button>
    {/if}

    <!-- Send private message -->
    <button
        id="send-private-message"
        class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
        on:click={() => analyticsClient.sendPrivateMessageMeetingAction()}
        on:click|preventDefault|stopPropagation={() => sendPrivateMessage()}
    >
        <img src={BubbleTalkPng} class="w-8 h-8" alt="Ellipsis icon" />
        <Tooltip text={$LL.camera.menu.senPrivateMessage()} leftPosition="true" />
    </button>

    <!-- Show visit card-->
    <button
        id="visit-card"
        class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
        on:click={() => analyticsClient.sendPrivateMessageMeetingAction()}
        on:click|preventDefault|stopPropagation={() => visitCard()}
    >
        <img src={NoVideoSvg} class="w-4 h-4" alt="Ellipsis icon" />
        <!-- <Tooltip text={$LL.camera.menu.showVisitCard()} leftPosition="true" /> -->
    </button>

    <!-- Block or report user -->
    {#if trackStreamWraper instanceof VideoPeer}
        <button
            id="block-or-report-user"
            class="action-button flex flex-row items-center justify-center p-0 mr-1 cursor-pointer"
            on:click={() => analyticsClient.reportMeetingAction()}
            on:click|preventDefault|stopPropagation={() => openBlockOrReportPopup()}
        >
            <img src={reportImg} class="w-4 h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.blockOrReportUser()} leftPosition="true" />
        </button>
    {/if}
</div>

<style lang="scss">
    .action-button {
        transition: all 0.2s;
        &:hover {
            --bg-opacity: 1;
            opacity: 1;
            transform: scale(1.2);
        }
    }
</style>
