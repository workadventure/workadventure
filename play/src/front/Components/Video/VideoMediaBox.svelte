<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss
    import { getContext, onDestroy } from "svelte";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { VideoBox } from "../../Space/Space";
    import { LL } from "../../../i18n/i18n-svelte";

    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import loaderImg from "../images/loader.svg";
    import MicOffIcon from "../Icons/MicOffIcon.svelte";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import ArrowsMaximizeIcon from "../Icons/ArrowsMaximizeIcon.svelte";
    import ArrowsMinimizeIcon from "../Icons/ArrowsMinimizeIcon.svelte";
    import { showFloatingUi } from "../../Utils/svelte-floatingui-show";
    import { userActivationManager } from "../../Stores/UserActivationStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import ActionMediaBox from "./ActionMediaBox.svelte";
    import UserName from "./UserName.svelte";
    import UpDownChevron from "./UpDownChevron.svelte";
    import CenteredVideo from "./CenteredVideo.svelte";

    export let fullScreen = false;
    export let videoBox: VideoBox; // If true, and if there is no video, the height of the video box will be 11rem
    export let miniMode = false;
    $: streamableStore = videoBox.streamable;
    $: streamable = $streamableStore;

    // Access reconnecting and persistent issue connections stores to show appropriate UI states
    const gameScene = gameManager.getCurrentGameScene();
    const spaceRegistry = gameScene.spaceRegistry;
    const reconnectingConnectionsStore = spaceRegistry.reconnectingConnectionsStore;
    const persistentIssueConnectionsStore = spaceRegistry.persistentIssueConnectionsStore;

    // The inCameraContainer is used to know if the VideoMediaBox is part of a series or video or if it is the highlighted video.
    let inCameraContainer: boolean = getContext("inCameraContainer");

    let extendedSpaceUser = videoBox.spaceUser;

    const pictureStore = extendedSpaceUser.pictureStore;

    let name = videoBox.spaceUser.name;

    let showUserSubMenu = false;

    $: hasVideoStore = streamable?.hasVideo;
    $: hasAudioStore = streamable?.hasAudio;
    $: isMutedStore = streamable?.isMuted;
    $: rawStatusStore = streamable?.statusStore;
    $: volumeStore = streamable?.volumeStore;
    $: showVoiceIndicatorStore = streamable?.showVoiceIndicator;
    $: isBlockedStore = streamable?.media?.isBlocked;

    // Check if user is currently reconnecting (WebRTC retry in progress)
    $: isReconnecting = $reconnectingConnectionsStore.has(extendedSpaceUser.spaceUserId);

    // Check if connection has a persistent issue (exceeded threshold attempts)
    $: hasPersistentIssue = $persistentIssueConnectionsStore.has(extendedSpaceUser.spaceUserId);

    // Get the original status from the streamable
    $: originalStatus = rawStatusStore ? $rawStatusStore : undefined;

    // Effective status: determine what UI state to show
    // Note: hasPersistentIssue doesn't change the effectiveStatus, it's used to show a warning message while reconnecting
    $: effectiveStatus = isReconnecting
        ? "connecting"
        : originalStatus === "error" || originalStatus === "closed"
        ? "connecting" // Show loader for error/closed states (reconnection pending)
        : originalStatus ?? "connecting";

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

    // When the status is "connecting", do not show the loader for 500ms to avoid visual glitch during fast connections.
    // EXCEPT when reconnecting: in that case, show the loader immediately to avoid black screen.
    function updateShowAfterDelay(status: string | undefined, reconnecting: boolean): void {
        if (status === "connecting") {
            if (reconnecting) {
                // Reconnecting: show loader immediately (no delay) to avoid black screen
                showAfterDelay = true;
                if (connectingTimer) {
                    clearTimeout(connectingTimer);
                    connectingTimer = null;
                }
            } else {
                // Initial connection: wait 500ms before showing loader
                showAfterDelay = false;
                if (connectingTimer) clearTimeout(connectingTimer);
                connectingTimer = setTimeout(() => {
                    showAfterDelay = true;
                }, 500);
            }
        } else {
            showAfterDelay = true;
            if (connectingTimer) {
                clearTimeout(connectingTimer);
                connectingTimer = null;
            }
        }
    }

    $: updateShowAfterDelay(effectiveStatus, isReconnecting);

    function highlightPeer(videoBox: VideoBox) {
        highlightedEmbedScreen.highlight(videoBox);
        analyticsClient.pinMeetingAction();
        window.focus();
    }

    onDestroy(() => {
        closeFloatingUi?.();
        if (connectingTimer) clearTimeout(connectingTimer);
    });
</script>

<div
    class="group/screenshare relative flex justify-center mx-auto h-full w-full @container/videomediabox screen-blocker"
>
    <div
        class={"z-20 w-full rounded-lg transition-all bg-center bg-no-repeat " +
            (fullScreen || effectiveStatus !== "connected"
                ? effectiveStatus === "connecting"
                    ? "bg-gray-700/80 backdrop-blur"
                    : "bg-contrast/80 backdrop-blur"
                : "")}
        style={videoEnabled && effectiveStatus === "connecting" ? "background-image: url(" + loaderImg + ")" : ""}
        class:h-full={videoEnabled || !miniMode}
        class:h-11={!videoEnabled && miniMode}
        class:flex-col={videoEnabled}
        class:items-center={!videoEnabled || effectiveStatus === "connecting"}
        class:flex-row={!videoEnabled}
        class:relative={!videoEnabled}
        class:rounded-lg={!fullScreen}
        class:justify-center={effectiveStatus === "connecting"}
    >
        <!-- Status messages based on connection state -->
        {#if effectiveStatus === "connecting" && showAfterDelay}
            <!-- Connecting/Reconnecting state: show spinner with appropriate message -->
            <div class="absolute w-full h-full overflow-hidden">
                <div
                    class="flex w-8 h-8 justify-center items-center absolute right-2 top-2 @[22rem]/videomediabox:w-full @[22rem]/videomediabox:right-auto @[22rem]/videomediabox:top-auto @[22rem]/videomediabox:h-full @[22rem]/videomediabox:justify-center @[22rem]/videomediabox:items-center @[22rem]/videomediabox:right-none @[22rem]/videomediabox:top-none"
                >
                    <div class="connecting-spinner" />
                </div>
            </div>
            <div class="absolute w-full h-full pointer-events-none">
                <div class="w-full h-full flex flex-col justify-end items-center pb-4">
                    {#if hasPersistentIssue}
                        <!-- Persistent issue: show warning message while still reconnecting -->
                        <div class="text-lg text-white font-bold text-center px-4">
                            {$LL.video.persistent_connection_issue()}
                        </div>
                    {:else}
                        <div class="text-lg text-white font-bold">
                            {#if isReconnecting}
                                {$LL.video.reconnecting()}
                            {:else}
                                {$LL.video.connecting()}
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>
        {/if}

        {#if showAfterDelay && streamable?.media}
            <!-- FIXME: expectVideoOutput and videoEnabled are always equal -->
            <CenteredVideo
                media={streamable?.media}
                {videoEnabled}
                {effectiveStatus}
                verticalAlign={!inCameraContainer && !fullScreen ? "top" : "center"}
                isTalking={showVoiceIndicator}
                flipX={streamable?.flipX}
                cover={streamable?.displayMode === "cover" && inCameraContainer && !fullScreen}
                isBlocked={$isBlockedStore}
                withBackground={(inCameraContainer && effectiveStatus !== "connecting") || $isBlockedStore}
                {isMegaphoneSpace}
            >
                <UserName
                    name={name ?? "unknown"}
                    picture={pictureStore}
                    isPlayingAudio={showVoiceIndicator}
                    isCameraDisabled={(!videoEnabled && !miniMode) || effectiveStatus !== "connected"}
                    isBlocked={$isBlockedStore}
                    position={videoEnabled && !$isBlockedStore && effectiveStatus === "connected"
                        ? "absolute bottom-0 left-0 @[17.5rem]/videomediabox:bottom-2 @[17.5rem]/videomediabox:left-2"
                        : "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"}
                    grayscale={effectiveStatus === "connecting"}
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
                                    <ArrowsMinimizeIcon classList="w-14" />
                                </button>
                            {/if}
                            <button
                                class="muted-video p-4 h-full w-full hover:bg-white/10 flex justify-start cursor-pointer items-center z-25 rounded-lg text-base"
                                on:click={toggleFullScreen}
                            >
                                {#if fullScreen}
                                    <ArrowsMinimizeIcon classList="w-14" />
                                {:else}
                                    <ArrowsMaximizeIcon classList="w-14" />
                                {/if}
                            </button>
                        </div>
                    </div>
                {/if}
                {#if effectiveStatus === "connected" && $hasAudioStore}
                    <div class="z-[251] absolute p-2 right-1" class:top-1={videoEnabled} class:top-0={!videoEnabled}>
                        {#if !$isMutedStore}
                            <SoundMeterWidget
                                volume={$volumeStore}
                                cssClass="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                                barColor="white"
                            />
                        {:else}
                            <MicOffIcon ariaLabel={$LL.video.user_is_muted({ name: name ?? "unknown" })} />
                        {/if}
                    </div>
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
                <ArrowsMaximizeIcon />
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
</style>
