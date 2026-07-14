<script lang="ts">
    import { readable, writable } from "svelte/store";
    import type { Writable } from "svelte/store";
    import { AvailabilityStatus, type PrivateSpaceEvent, type SpaceEvent } from "@workadventure/messages";
    import type { VideoBox as VideoBoxModel, VideoBoxStreamableEntry } from "../../Space/VideoBox";
    import type { Streamable } from "../../Space/Streamable";
    import type { PeerStatus } from "../../WebRtc/RemotePeer";
    import type { SpaceUserExtended } from "../../Space/SpaceInterface";
    import CamerasContainerLayout from "./CamerasContainerLayout.svelte";
    import FakeLivekitMedia from "./FakeLivekitMedia.svelte";

    export type CameraHarnessEvent = {
        type: "acquire" | "release";
        id: string;
        at: number;
    };

    export type CameraHarness = {
        events: CameraHarnessEvent[];
        activeIds: () => string[];
    };

    interface Props {
        boxCount?: number;
        initialOneLine?: boolean;
        frameWidth?: number;
        frameHeight?: number;
    }

    let { boxCount = 20, initialOneLine = true, frameWidth = 900, frameHeight = 190 }: Props = $props();

    let isOnOneLine = $state((() => initialOneLine)());
    const harness = createHarness((() => boxCount)());
    const storyWindow = window as Window & { __cameraHarness?: CameraHarness };
    storyWindow.__cameraHarness = harness;

    function createHarness(count: number): CameraHarness & { videoBoxes: VideoBoxModel[] } {
        const events: CameraHarnessEvent[] = [];
        const activeIds = new Set<string>();
        const videoBoxes = Array.from({ length: count }, (_, index) =>
            createVideoBox(`camera-${index + 1}`, index, events, activeIds),
        );

        return {
            events,
            activeIds: () => Array.from(activeIds),
            videoBoxes,
        };
    }

    function createVideoBox(
        id: string,
        index: number,
        events: CameraHarnessEvent[],
        activeIds: Set<string>,
    ): VideoBoxModel {
        const statusStore = writable<PeerStatus>("connected");
        const streamable = createStreamable(id, statusStore, events, activeIds);
        const streamableEntry: VideoBoxStreamableEntry = {
            id: 0,
            streamable,
            isPending: false,
        };

        return {
            uniqueId: id,
            spaceUser: createSpaceUser(id),
            priority: index,
            displayOrder: writable(index),
            statusStore,
            streamable: readable(streamable),
            streamables: readable([streamableEntry]),
            isMegaphoneSpace: false,
            markPendingStreamableReady: () => undefined,
        } as unknown as VideoBoxModel;
    }

    function createStreamable(
        id: string,
        statusStore: Writable<PeerStatus>,
        events: CameraHarnessEvent[],
        activeIds: Set<string>,
    ): Streamable {
        return {
            uniqueId: id,
            media: {
                type: "livekit",
                remoteVideoTrack: readable(undefined),
                streamStore: readable(undefined),
                isBlocked: readable(false),
                acquireVideoSubscription: () => {
                    let released = false;
                    activeIds.add(id);
                    events.push({ type: "acquire", id, at: performance.now() });
                    return () => {
                        if (released) {
                            return;
                        }
                        released = true;
                        activeIds.delete(id);
                        events.push({ type: "release", id, at: performance.now() });
                    };
                },
            },
            volumeStore: readable(undefined),
            hasVideo: readable(true),
            hasAudio: readable(false),
            statusStore,
            name: readable(id),
            showVoiceIndicator: readable(false),
            flipX: false,
            muteAudio: writable(true),
            displayMode: "cover",
            displayInPictureInPictureMode: false,
            usePresentationMode: false,
            spaceUserId: id,
            closeStreamable: () => undefined,
            canCloseStreamable: () => false,
            volume: writable(1),
            videoType: "video",
            webrtcStats: undefined,
        };
    }

    function createSpaceUser(id: string): SpaceUserExtended {
        return {
            isLogged: false,
            availabilityStatus: AvailabilityStatus.ONLINE,
            roomName: undefined,
            visitCardUrl: undefined,
            tags: [],
            cameraState: true,
            microphoneState: false,
            screenSharingState: false,
            megaphoneState: false,
            uuid: id,
            chatID: undefined,
            showVoiceIndicator: false,
            spaceUserId: id,
            name: id,
            playUri: id,
            color: "local",
            jitsiParticipantId: undefined,
            characterTextures: [],
            attendeesState: false,
            pictureStore: readable(undefined),
            emitPrivateEvent: (_message: NonNullable<PrivateSpaceEvent["event"]>) => undefined,
            space: {
                emitPublicMessage: (_message: NonNullable<SpaceEvent["event"]>) => undefined,
                canAskToMuteAudioOrTurnOffVideo: writable(false),
            },
            reactiveUser: {
                spaceUserId: id,
                playUri: id,
                roomName: "",
                name: writable(id),
                color: writable("local"),
                characterTextures: writable([]),
                showVoiceIndicator: writable(false),
                availabilityStatus: writable(AvailabilityStatus.ONLINE),
                isLogged: writable(false),
                visitCardUrl: writable(undefined),
                tags: writable([]),
                cameraState: writable(true),
                microphoneState: writable(false),
                attendeesState: writable(false),
                screenSharingState: writable(false),
                megaphoneState: writable(false),
                jitsiParticipantId: writable(undefined),
                uuid: writable(id),
                chatID: writable(undefined),
            },
        };
    }
</script>

{#if !initialOneLine}
    <button type="button" data-testid="switch-one-line" onclick={() => (isOnOneLine = true)}>Switch</button>
{/if}

<div class="camera-story-frame bg-black" style={`width: ${frameWidth}px; height: ${frameHeight}px; overflow: hidden;`}>
    <CamerasContainerLayout
        oneLineMaxHeight={180}
        {isOnOneLine}
        oneLineMode="horizontal"
        oneLineStreamableCollection={harness.videoBoxes}
        orderedStreamableCollection={harness.videoBoxes}
        activePictureInPicture={false}
        highlightedEmbedScreen={undefined}
        highlightFullScreen={false}
        playerMovedInTheLast10Seconds={true}
        localCameraVideoBox={undefined}
        cameraContainerHeightRatio={0.7}
        setMaxVisibleVideos={() => undefined}
        onCameraContainerHeightRatioChange={() => undefined}
        onResizeEnd={() => undefined}
        {mediaRenderer}
    />
</div>

{#snippet mediaRenderer(videoBox: VideoBoxModel)}
    <FakeLivekitMedia {videoBox} />
{/snippet}

<style>
    button {
        margin-bottom: 8px;
    }

    .camera-story-frame {
        position: relative;
    }
</style>
