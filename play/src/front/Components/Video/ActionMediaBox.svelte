<script lang="ts">
    import { get, writable } from "svelte/store";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MoreActionSvg from "../images/ellipsis.svg";
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
    import reportImg from "./images/report.svg";
    import { Streamable } from "../../Stores/StreamableCollectionStore";

    export let embedScreen: Streamable;
    export let trackStreamWraper: TrackStreamWrapperInterface;
    export let videoEnabled: boolean;

    let moreActionOpened = writable<boolean>(false);

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
        console.log("je suis dans la fonction pin");
        if (!videoEnabled) return;
        highlightedEmbedScreen.toggleHighlight(embedScreen);
        embedScreenLayoutStore.set(LayoutMode.Presentation);
    }

    function sendPrivateMessage() {
        console.info("Not implemented yet");
    }

    function toggleActionMenu(value: boolean) {
        console.log("value", value, $moreActionOpened, !$moreActionOpened);
        moreActionOpened.set(value);
    }

    function openBlockOrReportPopup() {
        trackStreamWraper.blockOrReportUser();
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class={`absolute top-0
    ${$moreActionOpened ? (!videoEnabled ? "-left-56" : "-left-14") : "-left-8"}
    flex flex-col flex-wrap justify-between items-center p-1 bg-black bg-opacity-50 rounded-lg max-h-full`}
    class:mt-[0.2rem]={!videoEnabled}
    on:click={() => analyticsClient.moreActionMetting()}
    on:click|preventDefault|stopPropagation={() => toggleActionMenu(!get(moreActionOpened))}
    on:mouseleave={() => toggleActionMenu(false)}
>
    {#if !$moreActionOpened}
        <!-- More action -->
        <button
            id="more-action"
            class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
        >
            <img src={MoreActionSvg} class="w-4 h-4" alt="Ellipsis icon" />
        </button>
    {:else}
        <!-- Less action -->
        <button
            id="less-action"
            class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
        >
            <img src={MoreActionSvg} class="w-4 h-4 rotate-90" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.closeMenu()} leftPosition="true" />
        </button>

        <!-- Pin -->
        {#if videoEnabled}
            <button
                id="pin"
                class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
                on:click={() => analyticsClient.pinMeetingAction()}
                on:click|preventDefault|stopPropagation={() => pin()}
            >
                <img src={PinSvg} class="w-4 h-4" alt="Ellipsis icon" />
                <Tooltip text={$LL.camera.menu.pin()} leftPosition="true" />
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
            <Tooltip text={$LL.camera.menu.muteAudioUser()} leftPosition="true" />
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
                class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
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
            <img src={BubbleTalkPng} class="w-4 h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.senPrivateMessage()} leftPosition="true" />
        </button>

        <!-- Block or report user -->
        {#if trackStreamWraper instanceof VideoPeer}
            <button
                id="block-or-report-user"
                class="action-button flex flex-row items-center justify-center p-0 mx-1 cursor-pointer"
                on:click={() => analyticsClient.reportMeetingAction()}
                on:click|preventDefault|stopPropagation={() => openBlockOrReportPopup()}
            >
                <img src={reportImg} class="w-4 h-4" alt="Ellipsis icon" />
                <Tooltip text={$LL.camera.menu.blockOrReportUser()} leftPosition="true" />
            </button>
        {/if}
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
