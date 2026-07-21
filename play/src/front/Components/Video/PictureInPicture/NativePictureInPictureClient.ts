import { get, type Readable, type Unsubscriber } from "svelte/store";
import Debug from "debug";
import type { Streamable } from "../../../Space/Streamable";
import type { VideoBox } from "../../../Space/VideoBox";
import type {
    DesktopPipAnnotationState,
    DesktopPipChatMessage,
    DesktopPipCommand,
    DesktopPipSdp,
    DesktopPipState,
    DesktopPipTile,
    WorkAdventureDesktopApi,
} from "../../../Interfaces/DesktopAppInterfaces";

const debug = Debug("app:NativePictureInPictureClient");

type WindowWithDesktop = Window & { WAD?: WorkAdventureDesktopApi };

/**
 * Returns the native desktop PiP API if (and only if) the host is the Electron desktop shell AND
 * the shell exposes the PiP API. In the browser this returns undefined and the caller falls back
 * to DocumentPictureInPicture.
 */
export function getDesktopPipApi(target: Window = window): NonNullable<WorkAdventureDesktopApi["pip"]> | undefined {
    const wad = (target as WindowWithDesktop).WAD;
    if (!wad || !wad.desktop) {
        return undefined;
    }
    return wad.pip;
}

export function isNativePictureInPictureAvailable(target: Window = window): boolean {
    return Boolean(getDesktopPipApi(target));
}

type StreamablesStore = Readable<Map<string, VideoBox>>;

type DeviceState = {
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    canScreenShare: boolean;
    recording: boolean;
};

type DeviceStateStore = Readable<DeviceState>;

type CommandHandlers = {
    toggleMic: () => void;
    toggleCamera: () => void;
    toggleScreenshare: () => void;
    pickScreenSource: (source: { id: string; name: string; displayId?: number }) => void;
    // Optional handlers for the extended presenter-bar surface (chat, reactions, annotation).
    sendChat?: (text: string) => void;
    sendReaction?: (emote: string) => void;
    annotationToggle?: () => void;
    annotationSetTool?: (tool: string) => void;
    annotationSetColor?: (color: string) => void;
    annotationUndo?: () => void;
    annotationClear?: () => void;
};

type NativeClientDeps = {
    streamables: StreamablesStore;
    /** The local user's camera VideoBox (e.g. myCameraPeerStore) — rendered as a floating self-tile. */
    selfBox: Readable<VideoBox | undefined>;
    deviceState: DeviceStateStore;
    /** Optional: recent proximity-chat messages mirrored into the floating window. */
    chatMessages?: Readable<DesktopPipChatMessage[]>;
    /** Optional: screen-annotation toolbar state mirrored into the floating window. */
    annotationState?: Readable<DesktopPipAnnotationState>;
    commandHandlers: CommandHandlers;
};

type TileSource = {
    /** Stable VideoBox id from the parent map, OR "self" for the local camera. */
    boxId: string;
    isSelf: boolean;
    /** Snapshot of the active streamable name. */
    name: string;
    /** Track IDs currently attached to the PC for this box. */
    trackIds: Set<string>;
    /**
     * The user-state truth: does this participant currently publish video? Drives placeholder
     * vs video rendering independently of WebRTC track availability — when the peer turns the
     * cam off we flip to placeholder immediately instead of waiting for the track to end.
     */
    hasVideo: boolean;
};

/**
 * Bridges the main renderer's MediaStreamTrack instances to the Electron utility BrowserWindow
 * over a renderer↔renderer RTCPeerConnection. SDP and ICE go through the main process (no
 * external network). Audio is intentionally not mirrored — the main window keeps playing it,
 * we only need a visual surface in the floating PiP window.
 *
 * In addition to media tracks, the client pushes per-tile metadata (name, isSelf, hasAudio) and
 * device state (mic/camera/screenshare) to the PiP renderer over a side IPC channel, and
 * subscribes to button commands from the PiP toolbar.
 */
export class NativePictureInPictureClient {
    private peerConnection: RTCPeerConnection | undefined;
    private unsubscribers: Unsubscriber[] = [];
    private videoBoxUnsubscribers = new Map<string, Unsubscriber>();
    private streamableUnsubscribers = new Map<string, Unsubscriber>();
    private streamUnsubscribers = new Map<string, Unsubscriber>();
    private nameUnsubscribers = new Map<string, Unsubscriber>();
    private hasAudioUnsubscribers = new Map<string, Unsubscriber>();
    private hasVideoUnsubscribers = new Map<string, Unsubscriber>();
    private selfBoxUnsubscriber: Unsubscriber | undefined;
    private selfStreamableUnsubscriber: Unsubscriber | undefined;
    private selfStreamUnsubscriber: Unsubscriber | undefined;
    private selfNameUnsubscriber: Unsubscriber | undefined;
    private deviceStateUnsubscriber: Unsubscriber | undefined;
    private chatMessagesUnsubscriber: Unsubscriber | undefined;
    private annotationStateUnsubscriber: Unsubscriber | undefined;

    private senderByTrackId = new Map<string, RTCRtpSender>();
    /** trackId → boxId (so we can map sender → tile metadata). */
    private boxIdByTrackId = new Map<string, string>();
    private tileSources = new Map<string, TileSource>();
    private hasAudioByBoxId = new Map<string, boolean>();
    private lastDeviceState: DeviceState = {
        micEnabled: false,
        cameraEnabled: false,
        screenSharing: false,
        canScreenShare: false,
        recording: false,
    };
    private lastChatMessages: DesktopPipChatMessage[] = [];
    private lastAnnotationState: DesktopPipAnnotationState | undefined;

    private pendingRenegotiate = false;
    private renegotiating = false;
    private stateSendScheduled = false;
    private active = false;
    private onClosedCallback: (() => void) | undefined;

    constructor(private readonly deps: NativeClientDeps) {}

    isActive(): boolean {
        return this.active;
    }

    async start(onClosed?: () => void): Promise<boolean> {
        const pip = getDesktopPipApi();
        if (!pip) {
            return false;
        }
        if (this.active) {
            return true;
        }
        this.active = true;
        this.onClosedCallback = onClosed;

        let opened = false;
        try {
            // pip.open() blocks in main process until the PiP renderer signals `app:pip:ready`,
            // so by the time we wire tracks below the renderer is guaranteed to have subscribed
            // to onOffer/onIce/onState.
            opened = await pip.open();
        } catch (error) {
            debug("pip.open() failed", error);
            this.active = false;
            return false;
        }
        if (!opened) {
            this.active = false;
            return false;
        }

        this.peerConnection = new RTCPeerConnection({ iceServers: [] });
        // eslint-disable-next-line listeners/no-inline-function-event-listener, listeners/no-missing-remove-event-listener -- listeners live with the peer connection and are dropped when it is closed in stop()
        this.peerConnection.addEventListener("icecandidate", (event) => {
            if (event.candidate) {
                pip.sendIce(event.candidate.toJSON());
            }
        });
        // eslint-disable-next-line listeners/no-inline-function-event-listener, listeners/no-missing-remove-event-listener -- listeners live with the peer connection and are dropped when it is closed in stop()
        this.peerConnection.addEventListener("connectionstatechange", () => {
            const state = this.peerConnection?.connectionState;
            if (state === "failed" || state === "closed") {
                debug(`peer connection ${state}`);
                this.stop();
            }
        });

        this.unsubscribers.push(
            pip.onAnswer((sdp) => {
                this.handleAnswer(sdp).catch((error) => debug("setRemoteDescription failed", error));
            }),
            pip.onIce((candidate) => {
                this.handleIce(candidate).catch((error) => debug("addIceCandidate failed", error));
            }),
            pip.onClosed(() => {
                debug("PiP window closed by main process");
                this.stop();
            }),
            pip.onRequestClose(() => {
                debug("PiP window asked to close");
                this.stop();
            }),
            pip.onCommand((command) => this.handleCommand(command)),
        );

        // Local self camera, rendered as the floating bottom-right tile in the PiP window.
        this.selfBoxUnsubscriber = this.deps.selfBox.subscribe((videoBox) => {
            this.detachSelfBox();
            if (videoBox) {
                this.selfStreamableUnsubscriber = videoBox.streamable.subscribe((streamable) => {
                    this.attachStreamable("self", streamable, true);
                });
            }
        });

        // Device state (mic/cam/screenshare) → state push.
        this.deviceStateUnsubscriber = this.deps.deviceState.subscribe((state) => {
            this.lastDeviceState = state;
            this.scheduleStateSend();
        });

        // Optional presenter-bar state (proximity chat + annotation toolbar) → state push.
        if (this.deps.chatMessages) {
            this.chatMessagesUnsubscriber = this.deps.chatMessages.subscribe((messages) => {
                this.lastChatMessages = messages;
                this.scheduleStateSend();
            });
        }
        if (this.deps.annotationState) {
            this.annotationStateUnsubscriber = this.deps.annotationState.subscribe((state) => {
                this.lastAnnotationState = state;
                this.scheduleStateSend();
            });
        }

        // Streamable collection (remote peers + local screen share).
        this.unsubscribers.push(
            this.deps.streamables.subscribe((collection) => {
                this.reconcileStreamables(collection);
                this.maybeRenegotiate().catch(() => {});
            }),
        );

        // After all initial subscriptions have fired synchronously, force a renegotiation. This
        // guards against the case where the immediate subscribe callbacks added tracks but the
        // first maybeRenegotiate call hit a stale `renegotiating` flag — by the time we reach
        // here, the flag is back to false and a fresh offer goes out with all tracks.
        this.maybeRenegotiate().catch(() => {});

        return true;
    }

    stop(): void {
        if (!this.active) {
            return;
        }
        this.active = false;

        // Reset re-entrant flags. If stop() lands in the middle of a renegotiation (or a
        // pending state send), these would otherwise survive into the next start() and either
        // swallow the first offer (renegotiating still true → maybeRenegotiate skips creating
        // the offer) or a queued microtask would call sendState() with stale data.
        this.renegotiating = false;
        this.pendingRenegotiate = false;
        this.stateSendScheduled = false;

        for (const unsub of this.unsubscribers) {
            try {
                unsub();
            } catch {
                /* ignore */
            }
        }
        this.unsubscribers = [];

        this.detachSelfBox();
        try {
            this.selfBoxUnsubscriber?.();
        } catch {
            /* ignore */
        }
        this.selfBoxUnsubscriber = undefined;
        try {
            this.deviceStateUnsubscriber?.();
        } catch {
            /* ignore */
        }
        this.deviceStateUnsubscriber = undefined;
        try {
            this.chatMessagesUnsubscriber?.();
        } catch {
            /* ignore */
        }
        this.chatMessagesUnsubscriber = undefined;
        try {
            this.annotationStateUnsubscriber?.();
        } catch {
            /* ignore */
        }
        this.annotationStateUnsubscriber = undefined;

        for (const unsub of this.videoBoxUnsubscribers.values()) {
            try {
                unsub();
            } catch {
                /* ignore */
            }
        }
        this.videoBoxUnsubscribers.clear();
        for (const unsub of this.streamableUnsubscribers.values()) {
            try {
                unsub();
            } catch {
                /* ignore */
            }
        }
        this.streamableUnsubscribers.clear();
        for (const unsub of this.streamUnsubscribers.values()) {
            try {
                unsub();
            } catch {
                /* ignore */
            }
        }
        this.streamUnsubscribers.clear();
        for (const unsub of this.nameUnsubscribers.values()) {
            try {
                unsub();
            } catch {
                /* ignore */
            }
        }
        this.nameUnsubscribers.clear();
        for (const unsub of this.hasAudioUnsubscribers.values()) {
            try {
                unsub();
            } catch {
                /* ignore */
            }
        }
        this.hasAudioUnsubscribers.clear();
        for (const unsub of this.hasVideoUnsubscribers.values()) {
            try {
                unsub();
            } catch {
                /* ignore */
            }
        }
        this.hasVideoUnsubscribers.clear();
        this.tileSources.clear();
        this.hasAudioByBoxId.clear();
        this.senderByTrackId.clear();
        this.boxIdByTrackId.clear();

        if (this.peerConnection) {
            try {
                this.peerConnection.close();
            } catch {
                /* ignore */
            }
            this.peerConnection = undefined;
        }

        const pip = getDesktopPipApi();
        if (pip) {
            pip.close().catch((error) => debug("pip.close() failed", error));
        }

        const onClosed = this.onClosedCallback;
        this.onClosedCallback = undefined;
        try {
            onClosed?.();
        } catch (error) {
            debug("onClosed callback threw", error);
        }
    }

    private async handleAnswer(sdp: DesktopPipSdp): Promise<void> {
        const pc = this.peerConnection;
        if (!pc || pc.signalingState === "closed") {
            return;
        }
        await pc.setRemoteDescription(sdp);
    }

    private async handleIce(candidate: RTCIceCandidateInit): Promise<void> {
        const pc = this.peerConnection;
        if (!pc || pc.signalingState === "closed") {
            return;
        }
        await pc.addIceCandidate(candidate);
    }

    private handleCommand(command: DesktopPipCommand): void {
        try {
            if (command.type === "toggle-mic") {
                this.deps.commandHandlers.toggleMic();
            } else if (command.type === "toggle-camera") {
                this.deps.commandHandlers.toggleCamera();
            } else if (command.type === "toggle-screenshare") {
                this.deps.commandHandlers.toggleScreenshare();
            } else if (command.type === "pick-source") {
                this.deps.commandHandlers.pickScreenSource({
                    id: command.sourceId,
                    name: command.sourceName,
                    displayId: command.displayId,
                });
            } else if (command.type === "close") {
                this.stop();
            } else if (command.type === "send-chat") {
                this.deps.commandHandlers.sendChat?.(command.text);
            } else if (command.type === "send-reaction") {
                this.deps.commandHandlers.sendReaction?.(command.emote);
            } else if (command.type === "annotation-toggle") {
                this.deps.commandHandlers.annotationToggle?.();
            } else if (command.type === "annotation-set-tool") {
                this.deps.commandHandlers.annotationSetTool?.(command.tool);
            } else if (command.type === "annotation-set-color") {
                this.deps.commandHandlers.annotationSetColor?.(command.color);
            } else if (command.type === "annotation-undo") {
                this.deps.commandHandlers.annotationUndo?.();
            } else if (command.type === "annotation-clear") {
                this.deps.commandHandlers.annotationClear?.();
            }
        } catch (error) {
            debug("command handler threw", error);
        }
    }

    private reconcileStreamables(collection: Map<string, VideoBox>): void {
        const seenIds = new Set<string>();
        for (const [id, videoBox] of collection) {
            seenIds.add(id);
            if (this.videoBoxUnsubscribers.has(id)) {
                continue;
            }
            const unsub = videoBox.streamable.subscribe((streamable) => {
                this.attachStreamable(id, streamable, false);
            });
            this.videoBoxUnsubscribers.set(id, unsub);
        }
        for (const [id, unsub] of this.videoBoxUnsubscribers) {
            if (!seenIds.has(id)) {
                try {
                    unsub();
                } catch {
                    /* ignore */
                }
                this.videoBoxUnsubscribers.delete(id);
                this.detachStreamable(id);
            }
        }
    }

    private attachStreamable(boxId: string, streamable: Streamable | undefined, isSelf: boolean): void {
        this.detachStreamable(boxId);
        if (!streamable) {
            return;
        }
        // Remote peers: only follow streamables explicitly opted in via displayInPictureInPictureMode.
        // The local self camera is always included (even though its own Streamable has the flag off).
        if (!isSelf && !streamable.displayInPictureInPictureMode) {
            return;
        }
        if (streamable.media.type !== "webrtc" && streamable.media.type !== "livekit") {
            return;
        }

        const source: TileSource = {
            boxId,
            isSelf,
            name: get(streamable.name) || (isSelf ? "You" : ""),
            trackIds: new Set(),
            hasVideo: get(streamable.hasVideo) === true,
        };
        this.tileSources.set(boxId, source);

        const nameUnsub = streamable.name.subscribe((name) => {
            const current = this.tileSources.get(boxId);
            if (!current) return;
            current.name = name || (current.isSelf ? "You" : "");
            this.scheduleStateSend();
        });
        this.nameUnsubscribers.set(boxId, nameUnsub);

        const hasAudioUnsub = streamable.hasAudio.subscribe((hasAudio) => {
            this.hasAudioByBoxId.set(boxId, Boolean(hasAudio));
            this.scheduleStateSend();
        });
        this.hasAudioUnsubscribers.set(boxId, hasAudioUnsub);

        // hasVideo is the user-facing truth ("did this participant publish a camera?") and may
        // flip before/after MediaStreamTracks arrive on the WebRTC connection. Use it directly to
        // decide placeholder vs video tile; the actual track only controls WHAT we render, not
        // WHETHER we show a placeholder.
        const hasVideoUnsub = streamable.hasVideo.subscribe((hasVideo) => {
            const current = this.tileSources.get(boxId);
            if (!current) return;
            current.hasVideo = Boolean(hasVideo);
            this.scheduleStateSend();
        });
        this.hasVideoUnsubscribers.set(boxId, hasVideoUnsub);

        const streamUnsub = streamable.media.streamStore.subscribe((stream) => {
            this.applyStream(boxId, stream);
        });
        this.streamUnsubscribers.set(boxId, streamUnsub);
    }

    private detachStreamable(boxId: string): void {
        const streamUnsub = this.streamUnsubscribers.get(boxId);
        if (streamUnsub) {
            try {
                streamUnsub();
            } catch {
                /* ignore */
            }
            this.streamUnsubscribers.delete(boxId);
        }
        const nameUnsub = this.nameUnsubscribers.get(boxId);
        if (nameUnsub) {
            try {
                nameUnsub();
            } catch {
                /* ignore */
            }
            this.nameUnsubscribers.delete(boxId);
        }
        const hasAudioUnsub = this.hasAudioUnsubscribers.get(boxId);
        if (hasAudioUnsub) {
            try {
                hasAudioUnsub();
            } catch {
                /* ignore */
            }
            this.hasAudioUnsubscribers.delete(boxId);
        }
        const hasVideoUnsub = this.hasVideoUnsubscribers.get(boxId);
        if (hasVideoUnsub) {
            try {
                hasVideoUnsub();
            } catch {
                /* ignore */
            }
            this.hasVideoUnsubscribers.delete(boxId);
        }
        const source = this.tileSources.get(boxId);
        if (source) {
            for (const trackId of source.trackIds) {
                this.removeTrack(trackId, false);
            }
        }
        this.tileSources.delete(boxId);
        this.hasAudioByBoxId.delete(boxId);
        this.scheduleStateSend();
    }

    private detachSelfBox(): void {
        try {
            this.selfStreamableUnsubscriber?.();
        } catch {
            /* ignore */
        }
        this.selfStreamableUnsubscriber = undefined;
        try {
            this.selfStreamUnsubscriber?.();
        } catch {
            /* ignore */
        }
        this.selfStreamUnsubscriber = undefined;
        try {
            this.selfNameUnsubscriber?.();
        } catch {
            /* ignore */
        }
        this.selfNameUnsubscriber = undefined;
        this.detachStreamable("self");
    }

    private applyStream(boxId: string, stream: MediaStream | undefined): void {
        const pc = this.peerConnection;
        const source = this.tileSources.get(boxId);
        if (!pc || pc.signalingState === "closed" || !source) {
            return;
        }
        const incomingIds = new Set<string>();
        if (stream) {
            for (const track of stream.getVideoTracks()) {
                incomingIds.add(track.id);
                if (source.trackIds.has(track.id)) continue;
                try {
                    const sender = pc.addTrack(track, stream);
                    this.senderByTrackId.set(track.id, sender);
                    this.boxIdByTrackId.set(track.id, boxId);
                    source.trackIds.add(track.id);
                    // eslint-disable-next-line listeners/no-inline-function-event-listener, listeners/no-missing-remove-event-listener -- the track is discarded when it ends; removeTrack() cleans up our bookkeeping
                    track.addEventListener("ended", () => this.removeTrack(track.id, true));
                } catch (error) {
                    debug("addTrack failed", error);
                }
            }
        }
        // Drop any track we previously attached for this box but is no longer in the stream.
        for (const trackId of Array.from(source.trackIds)) {
            if (!incomingIds.has(trackId)) {
                this.removeTrack(trackId, false);
            }
        }
        this.maybeRenegotiate().catch(() => {});
        this.scheduleStateSend();
    }

    private removeTrack(trackId: string, renegotiate: boolean): void {
        const pc = this.peerConnection;
        const sender = this.senderByTrackId.get(trackId);
        const boxId = this.boxIdByTrackId.get(trackId);
        this.senderByTrackId.delete(trackId);
        this.boxIdByTrackId.delete(trackId);
        if (boxId) {
            this.tileSources.get(boxId)?.trackIds.delete(trackId);
        }
        if (pc && sender) {
            try {
                pc.removeTrack(sender);
            } catch (error) {
                debug("removeTrack failed", error);
            }
        }
        if (renegotiate) {
            this.maybeRenegotiate().catch(() => {});
            this.scheduleStateSend();
        }
    }

    private async maybeRenegotiate(): Promise<void> {
        const pip = getDesktopPipApi();
        const pc = this.peerConnection;
        if (!pip || !pc || pc.signalingState === "closed") {
            return;
        }
        if (this.renegotiating) {
            this.pendingRenegotiate = true;
            return;
        }
        this.renegotiating = true;
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (pc.localDescription) {
                pip.sendOffer({ type: pc.localDescription.type, sdp: pc.localDescription.sdp });
            }
            // State send AFTER the offer so the renderer has both the new transceivers and the
            // matching metadata in roughly the same tick.
            this.sendState();
        } catch (error) {
            debug("renegotiation failed", error);
        } finally {
            this.renegotiating = false;
            if (this.pendingRenegotiate) {
                this.pendingRenegotiate = false;
                this.maybeRenegotiate().catch(() => {});
            }
        }
    }

    private scheduleStateSend(): void {
        if (this.stateSendScheduled) return;
        this.stateSendScheduled = true;
        queueMicrotask(() => {
            this.stateSendScheduled = false;
            this.sendState();
        });
    }

    private sendState(): void {
        const pip = getDesktopPipApi();
        if (!pip || !this.active) return;
        const tiles: DesktopPipTile[] = [];
        for (const source of this.tileSources.values()) {
            const hasAudio = this.hasAudioByBoxId.get(source.boxId) === true;
            // Filter out trackIds whose sender is dead/replaced. Without this, a fast cam
            // toggle (or a toggle triggered by a new getUserMedia call when the user toggles
            // their mic) can leave a stale id in source.trackIds for one tick — long enough to
            // emit a phantom tile that the renderer would dedupe later, but which still
            // briefly violates the "one tile per participant" invariant.
            const liveTrackIds: string[] = [];
            for (const trackId of source.trackIds) {
                const sender = this.senderByTrackId.get(trackId);
                if (!sender || !sender.track || sender.track.readyState === "ended") {
                    continue;
                }
                liveTrackIds.push(trackId);
            }
            const showVideo = source.hasVideo && liveTrackIds.length > 0;
            if (!showVideo) {
                tiles.push({
                    tileKey: source.boxId,
                    trackId: "",
                    name: source.name,
                    isSelf: source.isSelf,
                    hasAudio,
                    hasVideo: false,
                });
                continue;
            }
            // Even if multiple senders exist for a participant (e.g. cam + simulcast layer), we
            // intentionally emit ONE tile per participant — the renderer will pick whichever
            // matching pc.ontrack lands, and the invariant "one tile per tileKey" is
            // enforced at the renderer level.
            tiles.push({
                tileKey: source.boxId,
                trackId: liveTrackIds[0],
                name: source.name,
                isSelf: source.isSelf,
                hasAudio,
                hasVideo: true,
            });
        }
        const state: DesktopPipState = {
            tiles,
            micEnabled: this.lastDeviceState.micEnabled,
            cameraEnabled: this.lastDeviceState.cameraEnabled,
            screenSharing: this.lastDeviceState.screenSharing,
            canScreenShare: this.lastDeviceState.canScreenShare,
            recording: this.lastDeviceState.recording,
            canRecord: false,
            chatMessages: this.lastChatMessages,
            annotation: this.lastAnnotationState,
        };
        try {
            pip.sendState(state);
        } catch (error) {
            debug("sendState failed", error);
        }
    }
}

/**
 * Pure policy: should we open the native PiP window right now? Extracted so the rule can be
 * unit-tested without a DOM or Electron runtime.
 *
 * `inActiveConversation` is the source of truth for "the user is engaged with at least one other
 * participant" — it flips true as soon as a proximity bubble forms, even before any media stream
 * starts flowing. That lets PiP auto-open the instant someone walks into the meeting while the
 * user is alt-tabbed elsewhere; with the older streams-only signal we'd wait for the first video
 * track and miss the entire "someone just joined you" UX window.
 */
export function shouldOpenNativePictureInPicture(input: {
    nativeAvailable: boolean;
    allowedByUser: boolean;
    inActiveConversation: boolean;
    userAwayFromApp: boolean;
    userManuallyOpened: boolean;
}): boolean {
    if (!input.nativeAvailable || !input.allowedByUser) {
        return false;
    }
    if (input.userManuallyOpened) {
        return input.inActiveConversation;
    }
    return input.userAwayFromApp && input.inActiveConversation;
}
