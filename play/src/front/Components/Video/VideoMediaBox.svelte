<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { writable } from "svelte/store";
    import { createPopperActions } from "svelte-popperjs";
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { LL } from "../../../i18n/i18n-svelte";

    import { selectDefaultSpeaker, speakerSelectedStore } from "../../Stores/MediaStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import loaderImg from "../images/loader.svg";
    import MicOffIcon from "../Icons/MicOffIcon.svelte";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import { volumeProximityDiscussionStore } from "../../Stores/PeerStore";
    import ArrowsMaximizeIcon from "../Icons/ArrowsMaximizeIcon.svelte";
    import ArrowsMinimizeIcon from "../Icons/ArrowsMinimizeIcon.svelte";
    import ActionMediaBox from "./ActionMediaBox.svelte";
    import UserName from "./UserName.svelte";
    import UpDownChevron from "./UpDownChevron.svelte";
    import CenteredVideo from "./CenteredVideo.svelte";
    import { IconArrowDown, IconArrowUp } from "@wa-icons";

    export let isHighlighted = false;
    export let peer: VideoPeer;

    const pictureStore = writable<string | undefined>(undefined);
    let extendedSpaceUser = peer.getExtendedSpaceUser();
    extendedSpaceUser
        .then((user) => {
            pictureStore.set(user.getWokaBase64);
        })
        .catch((e) => {
            console.error("Error getting the user picture: ", e);
        });
    let streamStore = peer.streamStore;
    let volumeStore = peer.volumeStore;
    let name = peer.player.name;
    let statusStore = peer.statusStore;
    let constraintStore = peer.constraintsStore;

    let embedScreen: Streamable;

    let showUserSubMenu = false;
    let menuDrop = false;
    let fullScreen = false;

    if (peer) {
        embedScreen = peer as unknown as Streamable;
    }

    $: videoEnabled = $constraintStore ? $constraintStore.video : false;

    function toggleFullScreen() {
        highlightFullScreen.update((current) => !current);
    }

    function exitFullScreen() {
        highlightedEmbedScreen.removeHighlight();
        highlightFullScreen.set(false);
    }

    const [popperRef, popperContent] = createPopperActions({
        placement: "bottom",
        //strategy: 'fixed',
    });
    const extraOpts = {
        modifiers: [
            { name: "offset", options: { offset: [0, 8] } },
            {
                name: "flip",
                options: {
                    fallbackPlacements: ["top", "right", "left"],
                },
            },
        ],
    };
</script>

<div class="group/screenshare flex justify-center mx-auto h-full w-full">
    <!-- FIXME: not sure when to round in blue the box -->
    <div
        class={"z-20 w-full rounded-lg transition-all bg-center bg-no-repeat " +
            (isHighlighted && $statusStore === "connected" ? "" : " bg-contrast/80 backdrop-blur")}
        style={videoEnabled && $statusStore === "connecting" ? "background-image: url(" + loaderImg + ")" : ""}
        class:border-4={false}
        class:border-solid={false}
        class:border-color={false}
        class:h-full={videoEnabled}
        class:h-11={!videoEnabled}
        class:flex-col={videoEnabled}
        class:items-center={!videoEnabled || $statusStore === "connecting" || $statusStore === "error"}
        class:flex-row={!videoEnabled}
        class:relative={!videoEnabled}
        class:justify-center={$statusStore === "connecting" || $statusStore === "error"}
    >
        {#if $statusStore === "connecting"}
            <div class="connecting-spinner" />
        {:else if $statusStore === "error"}
            <div class="rtc-error" />
        {/if}

        <CenteredVideo
            mediaStream={$streamStore ?? undefined}
            {videoEnabled}
            expectVideoOutput={$constraintStore?.video}
            outputDeviceId={$speakerSelectedStore}
            volume={$volumeProximityDiscussionStore}
            on:selectOutputAudioDeviceError={() => selectDefaultSpeaker()}
            verticalAlign={isHighlighted ? "top" : "center"}
        >
            <UserName
                {name}
                picture={pictureStore}
                isPlayingAudio={$constraintStore?.audio}
                position={videoEnabled ? "absolute bottom-4 left-4" : "absolute bottom-1.5 left-4"}
            >
                <div use:popperRef class="self-center">
                    <UpDownChevron enabled={showUserSubMenu} on:click={() => (showUserSubMenu = !showUserSubMenu)} />
                </div>
                {#if showUserSubMenu}
                    <!-- FIXME: migrate from popover to https://floating-ui-svelte.vercel.app/examples/popovers when we migrate to Svelte 5 -->
                    <!-- This way, we can remove the "h-24" class from the div that is a lie -->
                    <div use:popperContent={extraOpts} class="h-24">
                        <ActionMediaBox
                            {embedScreen}
                            trackStreamWrapper={peer}
                            {videoEnabled}
                            on:close={() => (showUserSubMenu = false)}
                        />
                    </div>
                {/if}
            </UserName>

            <!-- The button at the top of the video that opens the menu to go fullscreen -->
            <button
                class={isHighlighted
                    ? "w-8 h-8 bg-contrast/80 flex rounded-sm z-10 opacity-0 group-hover/screenshare:opacity-100 absolute inset-0 mx-auto"
                    : "hidden"}
                on:click={() => (menuDrop = !menuDrop)}
            >
                {#if menuDrop}
                    <IconArrowUp class="w-4 h-4 m-auto flex items-center text-white" />
                {:else}
                    <IconArrowDown class="w-4 h-4 m-auto flex items-center text-white" />
                {/if}
            </button>

            <!-- The menu to go fullscreen -->
            <div
                class={isHighlighted && menuDrop
                    ? "absolute top-0 bottom-0 right-0 left-0 m-auto h-28 w-60 z-20 rounded-lg bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 flex items-center justify-center cursor-pointer"
                    : "hidden"}
            >
                <div class="flex flex-col justify-evenly cursor-pointer h-full w-full">
                    <button
                        class="svg w-full hover:bg-white/10 flex justify-start items-center z-25 rounded-lg text-base"
                        on:click={exitFullScreen}
                        on:click={() => (menuDrop = !menuDrop)}
                    >
                        <ArrowsMinimizeIcon classList="mx-4" />
                        <span class="font-bold text-white">{$LL.video.reduce()}</span>
                    </button>
                    <div class="h-[1px] z-30 w-full bg-white/20" />
                    <button
                        class="muted-video w-full hover:bg-white/10 flex justify-start cursor-pointer items-center z-25 rounded-lg text-base"
                        on:click={toggleFullScreen}
                        on:click={() => (menuDrop = !menuDrop)}
                        on:click={() => (fullScreen = !fullScreen)}
                    >
                        {#if $highlightFullScreen}
                            <ArrowsMinimizeIcon classList="mx-4" />
                            <span class="font-bold cursor-pointer text-white">{$LL.video.exit_fullscreen()}</span>
                        {:else}
                            <ArrowsMaximizeIcon classList="mx-4" />
                            <span class="font-bold cursor-pointer text-white">{$LL.video.toggle_fullscreen()}</span>
                        {/if}
                    </button>
                </div>
            </div>

            {#if $statusStore === "connected"}
                <div class="z-[251] absolute right-3 top-1 aspect-ratio p-2">
                    {#if $constraintStore?.audio}
                        <SoundMeterWidget
                            volume={$volumeStore}
                            cssClass="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                            barColor="white"
                        />
                    {:else}
                        <MicOffIcon ariaLabel={$LL.video.user_is_muted({ name })} />
                    {/if}
                </div>
            {/if}
        </CenteredVideo>
    </div>

    <button
        class={isHighlighted || !videoEnabled
            ? "hidden"
            : "absolute top-0 bottom-0 right-0 left-0 m-auto h-14 w-14 z-20 p-4 rounded-full aspect-ratio bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 cursor-pointer"}
        on:click={() => highlightedEmbedScreen.highlight(peer)}
        on:click={() => analyticsClient.pinMeetingAction()}
    >
        <ArrowsMaximizeIcon />
    </button>
</div>

<style>
    .border-color {
        border-color: #4156f6;
    }
</style>
