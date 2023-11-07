<script lang="ts">
    import { writable } from "svelte/store";
    import { EmbedScreen, highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MoreActionSvg from "../images/ellipsis.svg";
    import MicrophoneCloseSvg from "../images/microphone-close.svg";
    import banUserSvg from "../images/ban-user.svg";
    import NoVideoSvg from "../images/no-video.svg";
    import PinSvg from "../images/pin.svg";
    import BubbleTalkPng from "../images/bubble-talk.png";
    import { TackStreamWrapper } from "../../Streaming/Contract/TackStreamWrapper";
    import Tooltip from "../Util/Tooltip.svelte";
    import { LL } from "../../../i18n/i18n-svelte";

    export let embedScreen: EmbedScreen;
    export let trackStreamWraper: TackStreamWrapper;

    let moreActionOpened = writable<boolean>(false);

    function muteAudio() {
        trackStreamWraper.muteAudio();
    }

    function muteAudioEveryBody() {
        trackStreamWraper.muteAudioEveryBody();
    }

    function muteVideo() {
        trackStreamWraper.muteVideo();
    }

    function muteVideoEveryBody() {
        trackStreamWraper.muteAudioEveryBody();
    }

    function ban() {
        trackStreamWraper.ban();
    }

    function pin() {
        highlightedEmbedScreen.toggleHighlight(embedScreen);
    }

    function sendPrivateMessage() {
        console.info("Not implemented yet");
    }

    function toggleActionMenu(value: boolean) {
        moreActionOpened.set(value);
    }
</script>

<div
    class={`tw-absolute tw-top-0 ${
        $moreActionOpened ? "-tw-left-14" : "-tw-left-8"
    } tw-flex tw-flex-col tw-flex-wrap tw-justify-between tw-items-center tw-p-1 tw-bg-black tw-bg-opacity-50 tw-rounded-lg tw-max-h-full`}
>
    {#if !$moreActionOpened}
        <!-- Moe action -->
        <button
            class="action-button tw-flex tw-flex-row tw-items-center tw-justify-center tw-p-0 tw-mx-1 tw-cursor-pointer"
            on:click|preventDefault|stopPropagation={() => toggleActionMenu(true)}
        >
            <img src={MoreActionSvg} class="tw-w-4 tw-h-4" alt="Ellipsis icon" />
        </button>
    {:else}
        <!-- Moe action -->
        <button
            class="action-button tw-flex tw-flex-row tw-items-center tw-justify-center tw-p-0 tw-mx-1 tw-cursor-pointer"
            on:click|preventDefault|stopPropagation={() => toggleActionMenu(false)}
        >
            <img src={MoreActionSvg} class="tw-w-4 tw-h-4 tw-rotate-90" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.closeMenu()} leftPosition="true" />
        </button>

        <!-- Pin -->
        <button
            class="action-button tw-flex tw-flex-row tw-items-center tw-justify-center tw-p-0 tw-mx-1 tw-cursor-pointer"
            on:click|preventDefault|stopPropagation={() => pin()}
        >
            <img src={PinSvg} class="tw-w-4 tw-h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.pin()} leftPosition="true" />
        </button>

        <!-- Mute audio user -->
        <button
            class="action-button tw-flex tw-flex-row tw-items-center tw-justify-center tw-p-0 tw-mx-1 tw-cursor-pointer"
            on:click|preventDefault|stopPropagation={() => muteAudio()}
        >
            <img src={MicrophoneCloseSvg} class="tw-w-4 tw-h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.muteAudioEveryBody()} leftPosition="true" />
        </button>

        <!-- Mute audio every body -->
        <button
            class="action-button tw-flex tw-flex-row tw-items-center tw-justify-center tw-p-0 tw-mx-1 tw-cursor-pointer"
            on:click|preventDefault|stopPropagation={() => muteAudioEveryBody()}
        >
            <img src={MicrophoneCloseSvg} class="tw-w-4 tw-h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.muteAudioUser()} leftPosition="true" />
        </button>

        <!-- Mute video -->
        <button
            class="action-button tw-flex tw-flex-row tw-items-center tw-justify-center tw-p-0 tw-mx-1 tw-cursor-pointer"
            on:click|preventDefault|stopPropagation={() => muteVideo()}
        >
            <img src={NoVideoSvg} class="tw-w-4 tw-h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.muteVideoUser()} leftPosition="true" />
        </button>

        <!-- Mute video every body -->
        <button
            class="action-button tw-flex tw-flex-row tw-items-center tw-justify-center tw-p-0 tw-mx-1 tw-cursor-pointer"
            on:click|preventDefault|stopPropagation={() => muteVideoEveryBody()}
        >
            <img src={NoVideoSvg} class="tw-w-4 tw-h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.muteVideoEveryBody()} leftPosition="true" />
        </button>

        <!-- Ban user -->
        <button
            class="action-button tw-flex tw-flex-row tw-items-center tw-justify-center tw-p-0 tw-mx-1 tw-cursor-pointer"
            on:click|preventDefault|stopPropagation={() => ban()}
        >
            <img src={banUserSvg} class="tw-w-4 tw-h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.banUser()} leftPosition="true" />
        </button>

        <!-- Send private message -->
        <button
            class="action-button tw-flex tw-flex-row tw-items-center tw-justify-center tw-p-0 tw-mx-1 tw-cursor-pointer"
            on:click|preventDefault|stopPropagation={() => sendPrivateMessage()}
        >
            <img src={BubbleTalkPng} class="tw-w-4 tw-h-4" alt="Ellipsis icon" />
            <Tooltip text={$LL.camera.menu.senPrivateMessage()} leftPosition="true" />
        </button>
    {/if}
</div>

<style lang="scss">
    .action-button {
        transition: all 0.2s;
        &:hover {
            --tw-bg-opacity: 1;
            opacity: 1;
            transform: scale(1.2);
        }
    }
</style>
