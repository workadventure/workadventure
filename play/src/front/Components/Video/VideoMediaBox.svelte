<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { Readable } from "svelte/store";
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
    import { createFloatingUiActions } from "../../Utils/svelte-floatingui";
    import { VideoConfig } from "../../Api/Events/Ui/PlayVideoEvent";
    import ActionMediaBox from "./ActionMediaBox.svelte";
    import UserName from "./UserName.svelte";
    import UpDownChevron from "./UpDownChevron.svelte";
    import CenteredVideo from "./CenteredVideo.svelte";
    import { IconArrowDown, IconArrowUp } from "@wa-icons";

    export let isHighlighted = false;
    export let fullScreen = false;
    export let peer: Streamable;

    const pictureStore = peer.pictureStore;
    let extendedSpaceUserPromise = peer.getExtendedSpaceUser();
    let showVoiceIndicatorStore = peer.showVoiceIndicator;

    let streamStore: Readable<MediaStream | undefined> | undefined = undefined;
    if (peer.media.type === "mediaStore") {
        streamStore = peer.media.streamStore;
    }

    // In the case of a video started from the scripting API, we can have a URL instead of a MediaStream
    let videoUrl: string | undefined = undefined;
    let videoConfig: VideoConfig | undefined = undefined;
    if (peer.media.type === "scripting") {
        videoUrl = peer.media.url;
        videoConfig = peer.media.config;
    }

    let volumeStore = peer.volumeStore;
    let name = peer.name;
    let statusStore = peer.statusStore;

    let embedScreen: Streamable;

    let showUserSubMenu = false;
    let menuDrop = false;
    let hasVideoStore = peer.hasVideo;
    let hasAudioStore = peer.hasAudio;
    let isMutedStore = peer.isMuted;

    if (peer) {
        embedScreen = peer as unknown as Streamable;
    }
    // If there is no constraintStore, we are in a screen sharing (so video is enabled)
    $: videoEnabled = $hasVideoStore;
    $: showVoiceIndicator = showVoiceIndicatorStore ? $showVoiceIndicatorStore : false;

    function toggleFullScreen() {
        highlightFullScreen.update((current) => !current);
    }

    function exitFullScreen() {
        highlightedEmbedScreen.removeHighlight();
        highlightFullScreen.set(false);
    }

    const [floatingUiRef, floatingUiContent] = createFloatingUiActions(
        {
            placement: "bottom",
        },
        12
    );
</script>

<div class="group/screenshare relative flex justify-center mx-auto h-full w-full @container/videomediabox">
    <div
        class={"z-20 w-full rounded-lg transition-all bg-center bg-no-repeat " +
            (fullScreen || $statusStore !== "connected" ? "bg-contrast/80 backdrop-blur" : "")}
        style={videoEnabled && $statusStore === "connecting" ? "background-image: url(" + loaderImg + ")" : ""}
        class:h-full={videoEnabled}
        class:h-11={!videoEnabled}
        class:flex-col={videoEnabled}
        class:items-center={!videoEnabled || $statusStore === "connecting" || $statusStore === "error"}
        class:flex-row={!videoEnabled}
        class:relative={!videoEnabled}
        class:rounded-lg={!fullScreen}
        class:justify-center={$statusStore === "connecting" || $statusStore === "error"}
    >
        {#if $statusStore === "connecting"}
            <div class="connecting-spinner" />
        {:else if $statusStore === "error"}
            <div class="rtc-error" />
        {/if}

        <!-- FIXME: expectVideoOutput and videoEnabled are always equal -->
        <CenteredVideo
            mediaStream={$streamStore}
            {videoEnabled}
            expectVideoOutput={videoEnabled}
            outputDeviceId={$speakerSelectedStore}
            volume={$volumeProximityDiscussionStore}
            on:selectOutputAudioDeviceError={() => selectDefaultSpeaker()}
            verticalAlign={isHighlighted && !fullScreen ? "top" : "center"}
            isTalking={showVoiceIndicator}
            flipX={peer.flipX}
            muted={peer.muteAudio}
            {videoUrl}
            {videoConfig}
        >
            <UserName
                name={$name}
                picture={pictureStore}
                isPlayingAudio={showVoiceIndicator}
                position={videoEnabled
                    ? "absolute -bottom-2 -left-2 @[17.5rem]/videomediabox:bottom-2 @[17.5rem]/videomediabox:left-2"
                    : "absolute bottom-0.5 left-3"}
            >
                {#await extendedSpaceUserPromise}
                    <div />
                {:then spaceUser}
                    {#if spaceUser}
                        <div use:floatingUiRef class="self-center">
                            <UpDownChevron
                                enabled={showUserSubMenu}
                                on:click={() => (showUserSubMenu = !showUserSubMenu)}
                            />
                        </div>
                        {#if showUserSubMenu}
                            <div use:floatingUiContent class="absolute">
                                <ActionMediaBox
                                    {embedScreen}
                                    {spaceUser}
                                    {videoEnabled}
                                    on:close={() => (showUserSubMenu = false)}
                                />
                            </div>
                        {/if}
                    {/if}
                {:catch error}
                    <div class="bg-danger">{error}</div>
                {/await}
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
                    >
                        {#if fullScreen}
                            <ArrowsMinimizeIcon classList="mx-4" />
                            <span class="font-bold cursor-pointer text-white">{$LL.video.exit_fullscreen()}</span>
                        {:else}
                            <ArrowsMaximizeIcon classList="mx-4" />
                            <span class="font-bold cursor-pointer text-white">{$LL.video.toggle_fullscreen()}</span>
                        {/if}
                    </button>
                </div>
            </div>

            {#if $statusStore === "connected" && $hasAudioStore}
                <div
                    class="z-[251] absolute aspect-ratio p-2 right-1"
                    class:top-1={videoEnabled}
                    class:top-0={!videoEnabled}
                >
                    {#if !$isMutedStore}
                        <SoundMeterWidget
                            volume={$volumeStore}
                            cssClass="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                            barColor="white"
                        />
                    {:else}
                        <MicOffIcon ariaLabel={$LL.video.user_is_muted({ name: $name })} />
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
