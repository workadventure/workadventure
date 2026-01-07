<svelte:options immutable={true} />

<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { getContext, onDestroy } from "svelte";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { VideoBox } from "../../Space/Space";
    import { LL } from "../../../i18n/i18n-svelte";

    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import loaderImg from "../images/loader.svg";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import { showFloatingUi } from "../../Utils/svelte-floatingui-show";
    import { userActivationManager } from "../../Stores/UserActivationStore";
    import { displayVideoQualityStore } from "../../Stores/DisplayVideoQualityStore";
    import ActionMediaBox from "./ActionMediaBox.svelte";
    import UserName from "./UserName.svelte";
    import UpDownChevron from "./UpDownChevron.svelte";
    import CenteredVideo from "./CenteredVideo.svelte";
    import WebRtcStats from "./WebRtcStatsBox.svelte";
    import { IconArrowsMinimize, IconArrowsMaximize, IconMicrophoneOff } from "@wa-icons";

    export let fullScreen = false;
    export let videoBox: VideoBox; // If true, and if there is no video, the height of the video box will be 11rem
    export let miniMode = false;
    $: streamableStore = videoBox.streamable;
    $: streamable = $streamableStore;

    // The inCameraContainer is used to know if the VideoMediaBox is part of a series or video or if it is the highlighted video.
    let inCameraContainer: boolean = getContext("inCameraContainer");

    let extendedSpaceUser = videoBox.spaceUser;

    const pictureStore = extendedSpaceUser.pictureStore;

    let name = videoBox.spaceUser.name;

    let showUserSubMenu = false;

    $: hasVideoStore = streamable?.hasVideo;
    $: hasAudioStore = streamable?.hasAudio;
    $: isMutedStore = streamable?.isMuted;
    $: statusStore = streamable?.statusStore;
    $: volumeMeterStore = streamable?.volumeStore;
    $: showVoiceIndicatorStore = streamable?.showVoiceIndicator;
    $: isBlockedStore = streamable?.media?.isBlocked;
    $: volumeStore = streamable?.volume;
    $: volumeMeter = $volumeMeterStore;
    $: webRtcStatsStore = $displayVideoQualityStore ? streamable?.webrtcStats : undefined;
    $: webRtcStats = $webRtcStatsStore;

    $: showVoiceIndicator = showVoiceIndicatorStore ? $showVoiceIndicatorStore : false;

    // If there is no constraintStore, we are in a screen sharing (so video is enabled)

    $: videoEnabled = $hasVideoStore;

    $: isMegaphoneSpace = videoBox.isMegaphoneSpace ?? false;

    function toggleFullScreen() {
        highlightFullScreen.update((current) => !current);
    }

    function exitFullScreen() {
        highlightedEmbedScreen.removeHighlight();
        highlightFullScreen.set(false);
    }

    let userMenuButton: HTMLDivElement;

    let closeFloatingUi: (() => void) | undefined;

    function toggleUserMenu() {
        showUserSubMenu = !showUserSubMenu;
        const spaceUser = extendedSpaceUser;
        if (showUserSubMenu && spaceUser) {
            closeFloatingUi = showFloatingUi(
                userMenuButton,
                // @ts-ignore See https://github.com/storybookjs/storybook/issues/21884
                ActionMediaBox,
                {
                    spaceUser,
                    videoEnabled: videoEnabled ?? false,
                    volumeStore,
                    videoType: streamable?.videoType,
                    onClose: () => {
                        showUserSubMenu = false;
                        closeFloatingUi?.();
                    },
                },
                {
                    placement: "bottom",
                },
                8,
                false
            );
            // on:close={() => (showUserSubMenu = false)}
        } else {
            closeFloatingUi?.();
            closeFloatingUi = undefined;
        }
    }

    let showAfterDelay = true;
    let connectingTimer: ReturnType<typeof setTimeout> | null = null;

    // When the status is "connecting", do not show the video for 1 second. This is to avoid a visual glitch.
    // Most of the time, the connection is established in less than 1 second, so we do not want to show the loading spinner.
    const unsubscribeStatusStore = statusStore?.subscribe((status) => {
        if (status === "connecting") {
            showAfterDelay = false;
            if (connectingTimer) clearTimeout(connectingTimer);
            connectingTimer = setTimeout(() => {
                showAfterDelay = true;
            }, 500);
        } else {
            showAfterDelay = true;
            if (connectingTimer) {
                clearTimeout(connectingTimer);
                connectingTimer = null;
            }
        }
    });

    function highlightPeer(videoBox: VideoBox) {
        highlightedEmbedScreen.highlight(videoBox);
        analyticsClient.pinMeetingAction();
        window.focus();
    }

    onDestroy(() => {
        closeFloatingUi?.();
        if (connectingTimer) clearTimeout(connectingTimer);
        unsubscribeStatusStore?.();
    });
</script>

<div
    class="group/screenshare relative flex justify-center mx-auto h-full w-full @container/videomediabox screen-blocker"
>
    <div
        class={"z-20 w-full rounded-lg transition-all bg-center bg-no-repeat " +
            (fullScreen || $statusStore !== "connected"
                ? $statusStore === "error"
                    ? "animate-pulse-bg from-danger-1100/80 to-danger-900/80 backdrop-blur"
                    : $statusStore === "connecting"
                    ? "bg-gray-700/80 backdrop-blur"
                    : "bg-contrast/80 backdrop-blur"
                : "")}
        style={videoEnabled && $statusStore === "connecting" ? "background-image: url(" + loaderImg + ")" : ""}
        class:h-full={videoEnabled || !miniMode}
        class:h-11={!videoEnabled && miniMode}
        class:flex-col={videoEnabled}
        class:items-center={!videoEnabled || $statusStore === "connecting" || $statusStore === "error"}
        class:flex-row={!videoEnabled}
        class:relative={!videoEnabled}
        class:rounded-lg={!fullScreen}
        class:justify-center={$statusStore === "connecting" || $statusStore === "error"}
    >
        {#if $statusStore === "connecting" && showAfterDelay}
            <div class="absolute w-full h-full overflow-hidden">
                <div
                    class="flex w-8 h-8 justify-center items-center absolute right-2 top-2 @[22rem]/videomediabox:w-full @[22rem]/videomediabox:right-auto @[22rem]/videomediabox:top-auto @[22rem]/videomediabox:h-full @[22rem]/videomediabox:justify-center @[22rem]/videomediabox:items-center @[22rem]/videomediabox:right-none @[22rem]/videomediabox:top-none"
                >
                    <!--                <div class="w-8 h-8 flex justify-center items-center absolute right-2 top-2">-->
                    <div class="connecting-spinner" />
                </div>
            </div>
        {:else if $statusStore === "error"}
            <div class="absolute w-full h-full">
                <div class="w-full h-full flex justify-center items-end">
                    <div class="text-lg text-white bold mb-4">{$LL.video.connection_issue()}</div>
                </div>
            </div>
        {/if}

        {#if showAfterDelay && streamable?.media}
            <!-- FIXME: expectVideoOutput and videoEnabled are always equal -->
            <CenteredVideo
                media={streamable?.media}
                {videoEnabled}
                verticalAlign={!inCameraContainer && !fullScreen ? "top" : "center"}
                isTalking={showVoiceIndicator}
                flipX={streamable?.flipX}
                cover={streamable?.displayMode === "cover" && inCameraContainer && !fullScreen}
                isBlocked={$isBlockedStore}
                withBackground={(inCameraContainer && $statusStore !== "error" && $statusStore !== "connecting") ||
                    $isBlockedStore}
                {isMegaphoneSpace}
            >
                <UserName
                    name={name ?? "unknown"}
                    picture={pictureStore}
                    isPlayingAudio={showVoiceIndicator}
                    isCameraDisabled={!videoEnabled && !miniMode}
                    isBlocked={$isBlockedStore}
                    position={videoEnabled && !$isBlockedStore
                        ? "absolute bottom-0 left-0 @[17.5rem]/videomediabox:bottom-2 @[17.5rem]/videomediabox:left-2"
                        : "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"}
                    grayscale={$statusStore === "connecting"}
                >
                    {#if extendedSpaceUser && extendedSpaceUser.spaceUserId !== "local"}
                        <div
                            class="flex items-center justify-center picture-in-picture:hidden"
                            bind:this={userMenuButton}
                        >
                            <UpDownChevron enabled={showUserSubMenu} on:click={toggleUserMenu} />
                        </div>
                    {/if}
                </UserName>

                <!-- The button at the top of the video that opens the menu to go fullscreen -->
                {#if !inCameraContainer}
                    <!-- The menu to go fullscreen -->
                    <div
                        class="absolute m-auto top-0 right-0 left-0 h-14 w-fit z-20 rounded-lg bg-contrast/50 backdrop-blur transition-all opacity-50 hover:opacity-100 [@media(pointer:coarse)]:opacity-100 flex items-center justify-center cursor-pointer"
                    >
                        <div class="h-full w-full flex flex-row justify-evenly cursor-pointer">
                            {#if !fullScreen}
                                <button
                                    class="svg p-4 h-full w-full hover:bg-white/10 flex justify-start items-center z-25 rounded-lg text-base"
                                    on:click={exitFullScreen}
                                >
                                    <IconArrowsMinimize font-size="20" class="text-white" />
                                </button>
                            {/if}
                            <button
                                class="muted-video p-4 h-full w-full hover:bg-white/10 flex justify-start cursor-pointer items-center z-25 rounded-lg text-base"
                                on:click={toggleFullScreen}
                            >
                                {#if fullScreen}
                                    <IconArrowsMinimize font-size="20" class="text-white" />
                                {:else}
                                    <IconArrowsMaximize font-size="20" class="text-white" />
                                {/if}
                            </button>
                        </div>
                    </div>
                {/if}
                {#if $statusStore === "connected" && $hasAudioStore}
                    <div class="z-[251] absolute p-2 right-1" class:top-1={videoEnabled} class:top-0={!videoEnabled}>
                        {#if !$isMutedStore}
                            <SoundMeterWidget
                                volume={volumeMeter}
                                cssClass="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                                barColor="white"
                            />
                        {:else}
                            <IconMicrophoneOff
                                aria-label={$LL.video.user_is_muted({ name: name ?? "unknown" })}
                                data-testid={$LL.video.user_is_muted({ name: name ?? "unknown" })}
                                class="[filter:drop-shadow(0_0_3px_rgb(0,0,0))_drop-shadow(0_0_6px_rgb(0,0,0))_drop-shadow(0_0_9px_rgb(0,0,0))]"
                            />
                        {/if}
                    </div>
                {/if}
                {#if webRtcStats}
                    <WebRtcStats {webRtcStats} />
                {/if}
            </CenteredVideo>
        {/if}
    </div>

    {#if inCameraContainer && videoEnabled && $isBlockedStore === false}
        {#await userActivationManager.waitForUserActivation()}
            <!-- Waiting for user activation; nothing to show -->
        {:then value}
            <button
                class="full-screen-button absolute top-0 bottom-0 right-0 left-0 m-auto h-14 w-14 z-20 p-4 rounded-lg bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 hover:bg-white/10 cursor-pointer"
                on:click={() => highlightPeer(videoBox)}
            >
                <IconArrowsMaximize font-size="20" class="text-white" />
            </button>
        {/await}
    {/if}
    {#if !streamable?.muteAudio}
        {#await userActivationManager.waitForUserActivation()}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="absolute w-full h-full aspect-video mx-auto flex justify-center items-center bg-contrast/50 rounded-lg z-20 cursor-pointer"
                on:click={() => {
                    userActivationManager.notifyUserActivation();
                }}
            >
                <div class="text-center">
                    <div class="text-lg text-white bold">{$LL.video.click_to_unmute()}</div>
                </div>
            </div>
        {:then value}
            <!-- Nothing to do, the audio element is unmuted by the userActivationManager -->
        {/await}
    {/if}
</div>

<style>
    /* Spinner */
    .connecting-spinner {
        display: flex;
        left: calc(50% - 62px);
        top: calc(50% - 62px);

        /*width: 6rem;*/
        height: 75%;
        aspect-ratio: 1 / 1;
    }

    .connecting-spinner:after {
        content: " ";
        display: block;
        height: 100%;
        aspect-ratio: 1 / 1;
        border-radius: 50%;
        border: 6px solid theme("colors.light-blue");
        border-color: theme("colors.light-blue") transparent theme("colors.light-blue") transparent;
        animation: connecting-spinner 1.2s linear infinite;
    }

    @keyframes connecting-spinner {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .rtc-error {
        left: calc(50% - 68px);
        top: calc(42% - 68px);

        width: 8rem;
        height: 8rem;
    }

    .rtc-error:after {
        content: " ";
        display: block;
        width: 8rem;
        height: 8rem;
        border-radius: 50%;
        border: 6px solid #f00;
        animation: blinker 1s linear infinite;
    }

    @keyframes blinker {
        50% {
            opacity: 0;
        }
    }

    /* Black outline for mute icon SVG */
    /* Black outline for mute icon SVG */
    /* :global(.mute-icon-outline svg) {
        filter: drop-shadow(0 0 3px rgb(0, 0, 0)) drop-shadow(0 0 6px rgb(0, 0, 0))
            drop-shadow(0 0 9px rgb(0, 0, 0));
    } */

    /* Styles for mute icon SVG paths */
    :global(.mute-icon svg path) {
        stroke: #646464;
        stroke-width: 1px;
        stroke-dasharray: 2, 2;
        stroke-linejoin: round;
    }
</style>
