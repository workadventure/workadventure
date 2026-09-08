import { Buffer } from "buffer";
import * as Sentry from "@sentry/svelte";
import Debug from "debug";
import type { Readable, Unsubscriber, Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import Peer, { type PeerOptions } from "@workadventure/simple-peer";
import { ForwardableStore } from "@workadventure/store-utils";
import { type IceServer, FilterType } from "@workadventure/messages";
import { z } from "zod";
import { throttle } from "throttle-debounce";
import type { LocalStreamStoreValue } from "../Stores/MediaStore";
import { videoQualityStore } from "../Stores/MediaStore";
import { SoundMeter } from "../Phaser/Components/SoundMeter";
import type { SpaceInterface } from "../Space/SpaceInterface";
import { decrementWebRtcConnectionsCount, incrementWebRtcConnectionsCount } from "../Utils/E2EHooks";
import { deriveSwitchStore } from "../Stores/InterruptorStore";
import { volumeProximityDiscussionStore } from "../Stores/PeerStore";
import { screenShareQualityStore } from "../Stores/ScreenSharingStore";
import { bandwidthConstrainedPreferenceStore } from "../Stores/BandwidthConstrainedPreferenceStore";
import type { WebRtcSenderStats, WebRtcStats } from "../Components/Video/WebRtcStats";
import type { Streamable, StreamCategory, WebRtcStreamable } from "../Space/Streamable";
import { createMediaStreamTrackPresenceStore } from "../Space/MediaStreamTrackPresenceStore";
import type { UserSimplePeerInterface } from "./SimplePeer";
import { isFirefox } from "./DeviceUtils";
import { P2PMessage, STREAM_STOPPED_MESSAGE_TYPE } from "./P2PMessages/P2PMessage";
import { subscribeToOutboundVideoQualityAnalytics, subscribeToVideoQualityAnalytics } from "./VideoQualityAnalytics";
import { createPeerWebRtcStats } from "./WebRtcStatsFactory";
import {
    computeVideoEncoding,
    DEFAULT_VIEWER_DISPLAY,
    HIDDEN_VIEWER_DISPLAY,
    isViewerDisplayHidden,
    VIEWER_REPORT_TIMEOUT_MS,
    type ViewerDisplay,
} from "./AdaptiveVideoEncoding";
import { registerLocalEncoderStats } from "./LocalEncoderStats";
import { selectVideoPreset, type VideoQualitySetting } from "./VideoPresets";

export type PeerStatus = "connecting" | "connected" | "error" | "closed";

// Firefox needs more time for ICE negotiation
const CONNECTION_TIMEOUT = isFirefox() ? 10000 : 5000; // 10s for Firefox, 5s for others

const debug = Debug("webrtc:RemotePeer");

/**
 * A peer connection used to transmit video / audio signals between 2 peers.
 */
export class RemotePeer extends Peer implements Streamable {
    public _connected = false;
    public remoteStream!: MediaStream;
    private blocked = false;
    // public readonly userUuid: string;
    public readonly uniqueId: string;
    // private onBlockSubscribe: Subscription;
    // private onUnBlockSubscribe: Subscription;
    private readonly _remoteStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(
        undefined,
    );
    public readonly volumeStore: Readable<number[] | undefined>;
    private readonly _statusStore: Writable<PeerStatus> = writable<PeerStatus>("connecting");
    private closing = false; //this is used to prevent destroy() from being called twice
    private readonly localStreamStoreSubscribe: Unsubscriber;
    private readonly _hasVideo: Readable<boolean>;
    private readonly _hasAudio: Readable<boolean>;
    private readonly showVoiceIndicatorStore: ForwardableStore<boolean> = new ForwardableStore(false);
    public readonly flipX = false;
    public readonly muteAudio: Writable<boolean> = writable(false);
    public readonly displayMode: "fit" | "cover";
    public readonly usePresentationMode: boolean;
    public readonly displayInPictureInPictureMode = true;
    public isReceivingStream = false;
    private readonly _name: Readable<string>;
    private readonly _isBlocked: Readable<boolean>;
    private closeStreamableTimeout: ReturnType<typeof setTimeout> | undefined;
    public readonly volume: Writable<number>;
    public readonly videoType: StreamCategory;
    public readonly webrtcStats: Readable<WebRtcStats | undefined>;
    // Health of our own encoder on this connection (what we send to the peer)
    public readonly senderWebrtcStats: Readable<WebRtcSenderStats | undefined>;
    private senderAnalyticsUnsubscribe: Unsubscriber | undefined;
    private unregisterLocalEncoderStats: Unsubscriber | undefined;
    private analyticsStatsUnsubscribe: Unsubscriber | undefined;
    private analyticsRemoteStreamUnsubscribe: (() => void) | undefined;
    private receiverMaxBitrateBps: number | undefined;
    // Frame rate the remote sender targets for us, as last announced (see EncodingMessage); 0 while it pauses
    public expectedFps: number | undefined;
    // What the remote viewer displays of our video, as last reported (see ResolutionMessage)
    private viewerDisplay: ViewerDisplay = DEFAULT_VIEWER_DISPLAY;
    private viewerReportedDisplay = false;
    // Cuts the video if the viewer never tells us how it displays it (see VIEWER_REPORT_TIMEOUT_MS)
    private viewerReportTimeout: ReturnType<typeof setTimeout> | undefined;
    private videoEncodingRetryTimeout: ReturnType<typeof setTimeout> | undefined;
    /**
     * Set to true when closeStreamable() is called.
     * When preparingClose is true, we don't stop immediately sending our stream. Instead, we wait for the remote peer to
     * send a message on the data channel to inform us that it has stopped sending its own stream.
     * When this message is received, we can then close the peer connection.
     */
    private preparingClose = false;

    /**
     * Set to true when the peer is being closed intentionally (e.g., user leaving, kickoff, graceful shutdown).
     * This prevents triggering retry logic for expected disconnections.
     */
    private intentionalClose = false;

    // Store event listener functions for proper cleanup
    private readonly signalHandler = (data: unknown) => {
        if (this.closing) {
            return;
        }
        this.sendWebrtcSignal(data);

        const ZodCandidate = z.object({
            type: z.literal("candidate"),
        });
        if (ZodCandidate.safeParse(data).success && get(this._statusStore) === "connecting") {
            // If the signal is a candidate, we set a connection timer
            if (this.connectTimeout) {
                clearTimeout(this.connectTimeout);
            }
            this.connectTimeout = setTimeout(() => {
                this._statusStore.set("error");
            }, CONNECTION_TIMEOUT);
        }
    };

    private readonly streamHandler = (stream: MediaStream) => this.stream(stream);

    private readonly closeHandler = () => {
        this._statusStore.set("closed");
        this.isReceivingStream = false;
        this._connected = false;
        this.destroy();
    };

    private readonly errorHandler = (err: Error) => {
        this._statusStore.set("error");

        console.error(`error for user ${this.spaceUserId}`, err);
        if ("code" in err) {
            console.error(`error code => ${err.code}`);
        }

        // Firefox-specific error handling
        if (isFirefox() && err.message) {
            // Log Firefox-specific errors for better debugging
            if (err.message.includes("ICE")) {
                console.warn("Firefox ICE connection error - this may be temporary");
            } else if (err.message.includes("DTLS")) {
                console.warn("Firefox DTLS handshake error - checking TURN configuration");
            }
        }
    };

    private readonly iceTimeoutHandler = () => {
        this._statusStore.set("error");
    };

    private readonly connectHandler = () => {
        if (this.connectTimeout) {
            clearTimeout(this.connectTimeout);
        }
        if (this.closing) {
            return;
        }
        this._statusStore.set("connected");

        this._connected = true;
        this.applyVideoEncoding();

        /*const proximityRoomChat = gameManager.getCurrentGameScene().proximityChatRoom;

        if (proximityRoomChat.addIncomingUser != undefined) {
            const color = playersStore.getPlayerById(this.userId)?.color;
            proximityRoomChat.addIncomingUser(this.userId, this.userUuid, this.player.name, color ?? undefined);
        }*/
    };

    private readonly dataHandler = (chunk: Uint8Array<ArrayBufferLike>) => {
        try {
            const data = JSON.parse(new TextDecoder().decode(chunk));
            const message = P2PMessage.parse(data);

            switch (message.type) {
                case "blocked": {
                    // FIXME: blocking user level should be done at another level (we should not have to implement it both for Livekit and P2P mode)
                    // The "block" message should go through the space.

                    ////FIXME when A blacklists B, the output stream from A is muted in B's js client. This is insecure since B can manipulate the code to unmute A stream.
                    //// Find a way to block A's output stream in A's js client
                    //However, the output stream stream B is correctly blocked in A client
                    this.blocked = true;
                    this.toggleRemoteStream(false);
                    // const simplePeer = this.space.simplePeer;
                    // if (simplePeer) {
                    //     simplePeer.blockedFromRemotePlayer(this._spaceUserId);
                    // }
                    break;
                }
                case "unblocked": {
                    this.blocked = false;
                    this.toggleRemoteStream(true);
                    break;
                }
                case "kickoff": {
                    if (message.value !== this.spaceUserId) break;
                    this._statusStore.set("closed");
                    this._connected = false;
                    this.intentionalClose = true;
                    this._onFinish();
                    this.destroy();
                    break;
                }
                case "stream_stopped": {
                    if (this.isReceivingStream) {
                        this.isReceivingStream = false;
                    }
                    if (!this.localStream || this.preparingClose) {
                        // If the remote stream stopped and we are not sending a local stream, close the connection
                        this.closeHandler();
                    }
                    break;
                }
                case "resolution": {
                    this.updateVideoConstraintsForDisplayDimensions(message.width, message.height, message.maxBitrate);
                    break;
                }
                case "encoding": {
                    this.expectedFps = message.expectedFps;
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = message;
                }
            }
        } catch (e) {
            console.error("Unexpected P2P message received from peer: ", e);
            this._statusStore.set("error");
        }
    };

    public blockRemoteUser(userId: string) {
        this.toggleRemoteStream(false);
        this.sendBlockMessage(true);
    }

    private readonly finishHandler = () => {
        this._statusStore.set("closed");

        this._onFinish();
    };

    private connectTimeout: ReturnType<typeof setTimeout> | undefined;
    private localStream: MediaStream | undefined;

    constructor(
        public user: UserSimplePeerInterface,
        initiator: boolean,
        private space: SpaceInterface,
        iceServers: IceServer[],
        //private spaceUser: SpaceUserExtended,
        isLocalPeer: boolean,
        private localStreamStore: Readable<LocalStreamStoreValue | undefined>,
        private type: "video" | "screenSharing",
        private _spaceUserId: string,
        private _blockedUsersStore: Readable<Set<string>>,
        private onDestroy: (intentionalClose: boolean) => void,
        private _connectionId: string,
        defaultVolume: number = get(volumeProximityDiscussionStore),
    ) {
        incrementWebRtcConnectionsCount();
        const firefoxBrowser = isFirefox();

        // Firefox-specific configuration
        const peerConfig: PeerOptions = {
            initiator,
            config: {
                iceServers,
                // Firefox benefits from these additional settings
                ...(firefoxBrowser && {
                    iceCandidatePoolSize: 10,
                    bundlePolicy: "max-bundle" as RTCBundlePolicy,
                    rtcpMuxPolicy: "require",
                }),
            },
            preferredCodecs: {
                video: type === "video" ? ["video/VP9", "video/VP8"] : ["video/AV1", "video/VP9", "video/VP8"],
            },
            // Firefox works better with trickle ICE enabled
            ...(firefoxBrowser && { trickle: true }),
        };
        super(peerConfig);

        this.volume = writable(defaultVolume);
        this.videoType = type;
        this.displayMode = type === "video" ? "cover" : "fit";
        this.usePresentationMode = !(type === "video");
        //this.userUuid = spaceUser.uuid;
        this.uniqueId = isLocalPeer
            ? "localScreenSharingStream"
            : type === "video"
              ? "video_" + _spaceUserId
              : "screensharing_" + _spaceUserId;
        this._name = writable(this.space.getSpaceUserBySpaceUserId(this._spaceUserId)?.name ?? "Unknown");

        this.volumeStore = derived<typeof this._remoteStreamStore, number[] | undefined>(
            this._remoteStreamStore,
            ($mediaStream, set) => {
                if ($mediaStream === undefined) {
                    set(undefined);
                    return;
                }

                let soundMeter: SoundMeter | undefined;
                let interval: ReturnType<typeof setInterval> | undefined;
                let error = false;

                const startSoundMeter = () => {
                    if (soundMeter) {
                        soundMeter.stop();
                    }
                    if (interval) {
                        clearInterval(interval);
                    }

                    if ($mediaStream.getAudioTracks().length > 0) {
                        soundMeter = new SoundMeter($mediaStream);
                        error = false;
                        interval = setInterval(() => {
                            try {
                                set(soundMeter!.getVolume());
                            } catch (err) {
                                if (!error) {
                                    console.error(err);
                                    error = true;
                                }
                            }
                        }, 100);
                    } else {
                        set(undefined);
                    }
                };

                const stopSoundMeter = () => {
                    if ($mediaStream.getAudioTracks().length <= 0) {
                        if (soundMeter) {
                            soundMeter.stop();
                            soundMeter = undefined;
                        }
                        if (interval) {
                            clearInterval(interval);
                            interval = undefined;
                        }
                        set(undefined);
                    }
                };

                const handleTrackAdded = (event: MediaStreamTrackEvent) => {
                    if (event.track.kind === "audio") {
                        startSoundMeter();
                    }
                };

                const handleTrackRemoved = (event: MediaStreamTrackEvent) => {
                    if (event.track.kind === "audio") {
                        stopSoundMeter();
                    }
                };

                // Initial setup
                startSoundMeter();

                // Listen for track changes
                $mediaStream.addEventListener("addtrack", handleTrackAdded);
                $mediaStream.addEventListener("removetrack", handleTrackRemoved);

                return () => {
                    if (soundMeter) {
                        soundMeter.stop();
                    }
                    if (interval) {
                        clearInterval(interval);
                    }
                    $mediaStream.removeEventListener("addtrack", handleTrackAdded);
                    $mediaStream.removeEventListener("removetrack", handleTrackRemoved);
                };
            },
            undefined,
        );

        this._hasVideo = createMediaStreamTrackPresenceStore(this._remoteStreamStore, "video");

        this._hasAudio = createMediaStreamTrackPresenceStore(this._remoteStreamStore, "audio");

        this._isBlocked = derived(this._blockedUsersStore, ($blockedUsersStore) => {
            return $blockedUsersStore.has(this._spaceUserId);
        });

        // Event listeners are valid for the lifetime of the object and will be garbage collected when the object is destroyed
        /* eslint-disable listeners/no-missing-remove-event-listener */

        //start listen signal for the peer connection
        this.on("signal", this.signalHandler);

        this.on("stream", this.streamHandler);

        this.on("close", this.closeHandler);

        this.on("error", this.errorHandler);

        this.on("iceTimeout", this.iceTimeoutHandler);

        this.on("connect", this.connectHandler);

        this.on("data", this.dataHandler);

        this.once("finish", this.finishHandler);

        this.localStreamStoreSubscribe = deriveSwitchStore(
            this.localStreamStore,
            this.space.isStreamingVideoStore,
        ).subscribe((streamValue) => {
            try {
                if (streamValue === undefined || streamValue.type !== "success" || !streamValue.stream) {
                    if (this.localStream) {
                        this.removeStream(this.localStream);
                    }
                    this.localStream = undefined;
                    return;
                }
                if (!this.localStream) {
                    // Because simple-peer wants us to add / remove tracks on one given stream and given the fact
                    // the localStreamStore serves new streams all the time, we are reconstructing our own
                    // stable MediaStream inside the RemotePeer where we add / remove tracks on the fly.
                    this.localStream = new MediaStream();
                    this.addStream(this.localStream);
                    console.log("[WebRTC] stream sent successfully", {
                        userId: this.user.userId,
                        spaceUserId: this._spaceUserId,
                        type: this.type,
                        connectionId: this._connectionId,
                        audioTracks: streamValue.stream.getAudioTracks().length,
                        videoTracks: streamValue.stream.getVideoTracks().length,
                    });
                }
                let newVideoTrack: MediaStreamTrack | undefined;
                let newAudioTrack: MediaStreamTrack | undefined;
                let oldVideoTrack: MediaStreamTrack | undefined;
                let oldAudioTrack: MediaStreamTrack | undefined;
                if (streamValue.stream) {
                    newVideoTrack = RemotePeer.getFirstAndOnly(streamValue.stream.getVideoTracks());
                    oldVideoTrack = RemotePeer.getFirstAndOnly(this.localStream.getVideoTracks());

                    if (newVideoTrack && oldVideoTrack && newVideoTrack.id !== oldVideoTrack.id) {
                        debug("Replacing video track in P2P connection");
                        this.localStream.addTrack(newVideoTrack);
                        try {
                            this.replaceTrack(oldVideoTrack, newVideoTrack, this.localStream);
                        } finally {
                            this.localStream.removeTrack(oldVideoTrack);
                        }
                        this.applyVideoEncoding();
                    } else if (newVideoTrack && !oldVideoTrack) {
                        debug("Adding video track in P2P connection");
                        this.localStream.addTrack(newVideoTrack);
                        this.addTrack(newVideoTrack, this.localStream);
                        this.applyVideoEncoding();
                    } else if (oldVideoTrack && !newVideoTrack) {
                        debug("Removing video track in P2P connection");
                        try {
                            this.removeTrack(oldVideoTrack, this.localStream);
                        } finally {
                            this.localStream.removeTrack(oldVideoTrack);
                        }
                    }

                    newAudioTrack = RemotePeer.getFirstAndOnly(streamValue.stream.getAudioTracks());
                    oldAudioTrack = RemotePeer.getFirstAndOnly(this.localStream.getAudioTracks());

                    if (newAudioTrack && oldAudioTrack && newAudioTrack.id !== oldAudioTrack.id) {
                        debug("Replacing audio track in P2P connection");
                        this.localStream.addTrack(newAudioTrack);
                        try {
                            this.replaceTrack(oldAudioTrack, newAudioTrack, this.localStream);
                        } finally {
                            this.localStream.removeTrack(oldAudioTrack);
                        }
                    } else if (newAudioTrack && !oldAudioTrack) {
                        debug("Adding audio track in P2P connection");
                        this.localStream.addTrack(newAudioTrack);
                        this.addTrack(newAudioTrack, this.localStream);
                    } else if (oldAudioTrack && !newAudioTrack) {
                        debug("Removing audio track in P2P connection");
                        try {
                            this.removeTrack(oldAudioTrack, this.localStream);
                        } finally {
                            this.localStream.removeTrack(oldAudioTrack);
                        }
                    }

                    if (!newAudioTrack && !newVideoTrack) {
                        debug("No tracks left, removing stream in P2P connection");
                        // No tracks left, remove the stream
                        this.removeStream(this.localStream);
                        this.localStream = undefined;
                    }
                }
            } catch (e: unknown) {
                console.error(e);
                Sentry.captureException(e);
            }
        });

        const showVoiceIndicator = this.space.getSpaceUserBySpaceUserId(this._spaceUserId)?.reactiveUser
            .showVoiceIndicator;
        if (showVoiceIndicator && this.type === "video") {
            this.showVoiceIndicatorStore.forward(showVoiceIndicator);
        }

        const stats = createPeerWebRtcStats(this);
        this.webrtcStats = stats.receiver;
        this.senderWebrtcStats = stats.sender;
        // Shown in the local camera / screen share feedback tile
        this.unregisterLocalEncoderStats = registerLocalEncoderStats(this.type, this.senderWebrtcStats);
        // Each P2P connection has its own encoder: report it per peer.
        this.senderAnalyticsUnsubscribe = subscribeToOutboundVideoQualityAnalytics(
            this.senderWebrtcStats,
            {
                streamId: `${this._connectionId}:${this._spaceUserId}:${this.type}:outbound`,
                streamCategory: this.type,
                transportType: "P2P",
                remoteSpaceUserId: this._spaceUserId,
                remoteUserUuid: this.space.getSpaceUserBySpaceUserId(this._spaceUserId)?.uuid,
                spaceName: this.space.getName(),
                connectionId: this._connectionId,
            },
            (message) => this.space.emitVideoQualityReport(message),
        );
    }

    private sendBlockMessage(blocking: boolean) {
        this.write(
            new Buffer(
                JSON.stringify({
                    type: blocking ? "blocked" : "unblocked",
                }),
            ),
        );
    }

    public toggleRemoteStream(enable: boolean) {
        this.remoteStream.getTracks().forEach((track) => (track.enabled = enable));
    }

    private sendWebrtcSignal(data: unknown) {
        try {
            if (this.type === "video") {
                this.space.emitPrivateMessage(
                    {
                        $case: "webRtcSignal",
                        webRtcSignal: {
                            signal: JSON.stringify(data),
                            connectionId: this._connectionId,
                        },
                    },
                    this.user.userId,
                );
            } else {
                this.space.emitPrivateMessage(
                    {
                        $case: "webRtcScreenSharingSignal",
                        webRtcScreenSharingSignal: {
                            signal: JSON.stringify(data),
                            connectionId: this._connectionId,
                        },
                    },
                    this.user.userId,
                );
            }
        } catch (e) {
            console.error(`sendWebrtcSignal => ${this._spaceUserId}`, e);
        }
    }
    /**
     * Sends received stream to screen.
     */
    private stream(stream: MediaStream) {
        debug("Receiving stream from peer", this._spaceUserId);
        console.log("[WebRTC] stream received successfully", {
            userId: this.user.userId,
            spaceUserId: this._spaceUserId,
            type: this.type,
            connectionId: this._connectionId,
            audioTracks: stream.getAudioTracks().length,
            videoTracks: stream.getVideoTracks().length,
        });
        this._remoteStreamStore.set(stream);
        try {
            this.remoteStream = stream;
            if (this.blocked) {
                this.toggleRemoteStream(false);
            }
            if (stream) {
                this.bindAnalyticsToRemoteStream(stream);
            }
        } catch (err) {
            console.error(err);
        }

        if (!stream) {
            this.isReceivingStream = false;
            this.unbindAnalyticsFromRemoteStream();
        } else {
            this.isReceivingStream = true;
        }
    }

    private bindAnalyticsToRemoteStream(stream: MediaStream): void {
        this.unbindAnalyticsFromRemoteStream();

        const updateAnalyticsStatsSubscription = () => {
            const hasVideoTrack = stream.getVideoTracks().length > 0;

            if (hasVideoTrack && !this.analyticsStatsUnsubscribe) {
                this.analyticsStatsUnsubscribe = subscribeToVideoQualityAnalytics(
                    this.webrtcStats,
                    {
                        streamId: `${this._connectionId}:${this._spaceUserId}:${this.type}`,
                        streamCategory: this.type,
                        transportType: "P2P",
                        remoteSpaceUserId: this._spaceUserId,
                        remoteUserUuid: this.space.getSpaceUserBySpaceUserId(this._spaceUserId)?.uuid,
                        spaceName: this.space.getName(),
                        connectionId: this._connectionId,
                    },
                    (message) => this.space.emitVideoQualityReport(message),
                );
            } else if (!hasVideoTrack && this.analyticsStatsUnsubscribe) {
                this.analyticsStatsUnsubscribe();
                this.analyticsStatsUnsubscribe = undefined;
            }
        };

        const handleTrackAdded = (event: MediaStreamTrackEvent) => {
            if (event.track.kind === "video") {
                updateAnalyticsStatsSubscription();
            }
        };

        const handleTrackRemoved = (event: MediaStreamTrackEvent) => {
            if (event.track.kind === "video") {
                updateAnalyticsStatsSubscription();
            }
        };

        stream.addEventListener("addtrack", handleTrackAdded);
        stream.addEventListener("removetrack", handleTrackRemoved);
        updateAnalyticsStatsSubscription();

        this.analyticsRemoteStreamUnsubscribe = () => {
            stream.removeEventListener("addtrack", handleTrackAdded);
            stream.removeEventListener("removetrack", handleTrackRemoved);
            if (this.analyticsStatsUnsubscribe) {
                this.analyticsStatsUnsubscribe();
                this.analyticsStatsUnsubscribe = undefined;
            }
        };
    }

    private unbindAnalyticsFromRemoteStream(): void {
        this.analyticsRemoteStreamUnsubscribe?.();
        this.analyticsRemoteStreamUnsubscribe = undefined;
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    public destroy(error?: Error): void {
        try {
            // Explicitly stop tracks and clear the store to send a clear "off" signal
            const remoteStream = get(this._remoteStreamStore);
            if (remoteStream) {
                remoteStream.getTracks().forEach((track) => track.stop());
                this._remoteStreamStore.set(undefined);
            }

            this.off("signal", this.signalHandler);
            this.off("stream", this.streamHandler);
            this.off("close", this.closeHandler);
            this.off("error", this.errorHandler);
            this.off("iceTimeout", this.iceTimeoutHandler);
            this.off("connect", this.connectHandler);
            this.off("data", this.dataHandler);
            this.off("finish", this.finishHandler);

            if (this.connectTimeout) {
                clearTimeout(this.connectTimeout);
            }
            if (this.closeStreamableTimeout) {
                clearTimeout(this.closeStreamableTimeout);
            }
            if (this.videoEncodingRetryTimeout) {
                clearTimeout(this.videoEncodingRetryTimeout);
            }
            if (this.viewerReportTimeout) {
                clearTimeout(this.viewerReportTimeout);
            }

            this._connected = false;
            this.senderAnalyticsUnsubscribe?.();
            this.senderAnalyticsUnsubscribe = undefined;
            this.unregisterLocalEncoderStats?.();
            this.unregisterLocalEncoderStats = undefined;
            if (this.closing) {
                return;
            }
            this.closing = true;

            decrementWebRtcConnectionsCount();

            this.localStreamStoreSubscribe();
            this.unbindAnalyticsFromRemoteStream();

            super.destroy(error);

            this.onDestroy(this.intentionalClose);
        } catch (err) {
            console.error("VideoPeer::destroy", err);
        }
    }

    /**
     * Marks this peer for intentional closure.
     * Call this before destroy() when the disconnection is expected (user leaving, graceful shutdown).
     */
    public markAsIntentionalClose(): void {
        this.intentionalClose = true;
    }

    _onFinish() {
        if (this.destroyed) return;
        const destroySoon = () => {
            this.destroy();
        };
        if (this._connected) {
            destroySoon();
        } else {
            this.once("connect", destroySoon);
        }
    }

    get statusStore(): Readable<PeerStatus> {
        return this._statusStore;
    }

    get remoteStreamStore(): Readable<MediaStream | undefined> {
        return this._remoteStreamStore;
    }

    get media(): WebRtcStreamable {
        return {
            type: "webrtc",
            streamStore: this._remoteStreamStore,
            isBlocked: this._isBlocked,
            setDimensions: (width: number, height: number) => this._setDimensions(width, height),
        };
    }

    get connectionId(): string {
        return this._connectionId;
    }

    public stopStreamToRemoteUser() {
        if (!this.localStream) {
            return;
        }
        this.removeStream(this.localStream);
        this.localStream = undefined;
        this.write(
            new Buffer(
                JSON.stringify({
                    type: STREAM_STOPPED_MESSAGE_TYPE,
                }),
            ),
        );
    }

    public isReceivingScreenSharingStream(): boolean {
        return this.isReceivingStream;
    }

    /**
     * Returns true when this peer is sending a media stream to the remote peer.
     */
    public get isSendingStream(): boolean {
        return this.localStream !== undefined;
    }

    /**
     * Returns true if the given user can stream in this space.
     * - ALL_USERS: always true
     * - LIVE_STREAMING_USERS: when they have megaphoneState
     * - LIVE_STREAMING_USERS_WITH_FEEDBACK: when they have megaphoneState or attendeesState
     * Used to avoid closing the connection from VideoBox while local or remote could still stream.
     */
    private userCanStreamInSpace(spaceUserId: string): boolean {
        const filterType = this.space.filterType;
        switch (filterType) {
            case FilterType.ALL_USERS:
                return true;
            case FilterType.LIVE_STREAMING_USERS: {
                const user = this.space.getSpaceUserBySpaceUserId(spaceUserId);
                return user ? get(user.reactiveUser.megaphoneState) : false;
            }
            case FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK: {
                const user = this.space.getSpaceUserBySpaceUserId(spaceUserId);
                if (!user) {
                    return false;
                }
                const hasMegaphone = get(user.reactiveUser.megaphoneState);
                const isAttendee = get(user.reactiveUser.attendeesState);
                return hasMegaphone || isAttendee;
            }
            case FilterType.UNRECOGNIZED:
                Sentry.captureException(new Error("Invalid filter type"));
                return false;
            default: {
                const _exhaustiveCheck: never = filterType;
                return _exhaustiveCheck;
            }
        }
    }

    /**
     * Returns true if the local user or the remote user (this peer) can stream in this space.
     * When true, we do not close the connection from VideoBox so that streaming can start or continue.
     */
    private isLocalOrRemoteUserCanStreamInSpace(): boolean {
        return this.userCanStreamInSpace(this.space.mySpaceUserId) || this.userCanStreamInSpace(this._spaceUserId);
    }

    /**
     * Returns true when the streamable can be closed from the VideoBox: no media in either direction,
     * not already preparing close, and neither local nor remote user can stream in this space.
     */
    public canCloseStreamable(): boolean {
        if (this.preparingClose || this.isReceivingStream || this.isSendingStream) {
            return false;
        }

        return !this.isLocalOrRemoteUserCanStreamInSpace();
    }

    get hasVideo(): Readable<boolean> {
        return this._hasVideo;
    }

    get hasAudio(): Readable<boolean> {
        return this._hasAudio;
    }

    get name(): Readable<string> {
        return this._name;
    }

    get showVoiceIndicator(): Readable<boolean> {
        return this.showVoiceIndicatorStore;
    }

    get spaceUserId(): string | undefined {
        return this._spaceUserId;
    }

    /**
     * Sends the given media stream to the peer.
     * Will also dispatch the correct constraint message.
     */
    public dispatchStream(mediaStream: MediaStream): void {
        if (this.localStream) {
            if (this.localStream === mediaStream) {
                console.warn("RemotePeer::dispatchStream called with the same MediaStream as already set. Ignoring.");
                return;
            }
            this.removeStream(this.localStream);
        }
        this.localStream = mediaStream;

        this.addStream(mediaStream);
    }

    /**
     * This function is called when the RemotePeer video is replaced by a Livekit video.
     * We don't close the remote peer immediately, because we are sending data to the peer and the peer might
     * still need to receive the data while it is switching to Livekit.
     * Instead, we put the RemotePeer in a "preparing to close" state, and wait for the peer to send us a message
     * on the data channel to inform us that it has stopped sending its own stream.
     * When this message is received, the connection is closed automatically.
     * If after 5 seconds, the peer hasn't sent us the message, we close the connection anyway.
     */
    closeStreamable(): void {
        this.preparingClose = true;
        this.intentionalClose = true;
        if (this._connected) {
            this.write(
                Buffer.from(
                    JSON.stringify({
                        type: STREAM_STOPPED_MESSAGE_TYPE,
                    }),
                ),
            );
        }
        this.closeStreamableTimeout = setTimeout(() => {
            if (!this.destroyed) {
                this.destroy();
            }
        }, 5000);
    }

    /**
     * Called when the display dimensions change on the viewer side.
     * The logic is throttled to max one call every 250ms.
     */
    private _setDimensions = throttle(250, (width: number, height: number): void => {
        if (this.destroyed || this.closing) {
            // The tile of a closing peer unmounts and reports itself hidden: nothing to tell anymore.
            return;
        }
        try {
            // 0x0: we do not display the video, the sender stops encoding for us
            const hidden = width <= 0 || height <= 0;
            debug(
                `Adaptive video: reporting our display of ${this._spaceUserId} as ${hidden ? "hidden" : `${width}x${height}`}`,
            );
            this.write(
                new Buffer(
                    JSON.stringify({
                        type: "resolution",
                        width: hidden ? 0 : width,
                        height: hidden ? 0 : height,
                        maxBitrate: hidden ? 0 : this.getPresetForDimensions(width, height).bitrate,
                    } satisfies P2PMessage),
                ),
            );
        } catch (e) {
            console.error("Failed to send resolution message to peer", e);
        }
    });

    /**
     * Called when the remote viewer reports the size it displays our video in (0x0: not displayed).
     */
    private updateVideoConstraintsForDisplayDimensions(width: number, height: number, bandwidthLimit: number): void {
        this.viewerDisplay = { width, height, maxBitrate: bandwidthLimit };
        this.viewerReportedDisplay = true;
        if (this.viewerReportTimeout) {
            clearTimeout(this.viewerReportTimeout);
            this.viewerReportTimeout = undefined;
        }
        this.applyVideoEncoding();
    }

    /**
     * A viewer that displays our video reports its tile size within a second of receiving the stream. Without any
     * report (hidden tab, offscreen tile, unknown client), stop sending video rather than keep the default stream.
     */
    private cutVideoUnlessViewerReports(): void {
        if (this.viewerReportedDisplay || this.viewerReportTimeout) {
            return;
        }
        this.viewerReportTimeout = setTimeout(() => {
            this.viewerReportTimeout = undefined;
            if (this.viewerReportedDisplay) {
                return;
            }
            debug(`Adaptive video: no display report from ${this._spaceUserId} after ${VIEWER_REPORT_TIMEOUT_MS}ms`);
            this.viewerDisplay = HIDDEN_VIEWER_DISPLAY;
            this.applyVideoEncoding();
        }, VIEWER_REPORT_TIMEOUT_MS);
    }

    /**
     * Encodes for what the viewer displays: scaled down to its tile, and not at all while the tile is hidden.
     * Called when the connection opens, when our video track changes and when the viewer reports its tile.
     */
    private applyVideoEncoding(): void {
        const pc = this._pc as RTCPeerConnection | undefined;
        const videoSender = pc?.getSenders().find((s) => s.track?.kind === "video");
        if (!videoSender?.track) {
            return;
        }

        const parameters = videoSender.getParameters();
        if (!parameters.encodings || parameters.encodings.length === 0) {
            this.retryVideoEncodingLater();
            return;
        }

        this.cutVideoUnlessViewerReports();

        const settings = videoSender.track.getSettings();
        const encoding = computeVideoEncoding(
            this.viewerDisplay,
            { width: settings.width || 1280, height: settings.height || 720 },
            (width, height) => this.getPresetForDimensions(width, height),
        );

        if (this.type === "screenSharing") {
            parameters.degradationPreference = get(bandwidthConstrainedPreferenceStore);
        }
        parameters.encodings[0].active = encoding.active;
        if (encoding.active) {
            parameters.encodings[0].maxBitrate = encoding.maxBitrate;
            parameters.encodings[0].maxFramerate = encoding.maxFramerate;
            if (encoding.scaleResolutionDownBy !== undefined) {
                parameters.encodings[0].scaleResolutionDownBy = encoding.scaleResolutionDownBy;
            } else {
                delete parameters.encodings[0].scaleResolutionDownBy;
            }
        }

        // Apply parameters transactionally
        videoSender
            .setParameters(parameters)
            .then(() => {
                this.videoEncodingRetries = 0;
                this.announceExpectedFps(encoding.active ? encoding.maxFramerate : 0, settings.frameRate);
                debug(
                    isViewerDisplayHidden(this.viewerDisplay)
                        ? "Adaptive video: viewer does not display our video, encoder paused"
                        : `Adaptive video: applied ${this.viewerDisplay.width}x${this.viewerDisplay.height} @ ${encoding.maxBitrate}bps, ${encoding.maxFramerate}fps, scale ${encoding.scaleResolutionDownBy ?? 1}`,
                );
            })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === "InvalidStateError") {
                    // Chrome rejects setParameters() until the first negotiation of the sender is done.
                    this.retryVideoEncodingLater();
                    return;
                }
                console.error("Adaptive video: failed to set parameters", err);
            });
    }

    /**
     * Tells the viewer the frame rate to expect from us, so that it does not count our deliberate changes
     * (pause, tile resized) as an unstable connection.
     */
    private announceExpectedFps(maxFramerate: number | undefined, captureFrameRate: number | undefined): void {
        if (this.destroyed || this.closing) {
            return;
        }
        const expectedFps = Math.min(maxFramerate ?? captureFrameRate ?? 0, captureFrameRate ?? Infinity);
        try {
            this.write(
                new Buffer(
                    JSON.stringify({
                        type: "encoding",
                        expectedFps: Number.isFinite(expectedFps) ? expectedFps : 0,
                    } satisfies P2PMessage),
                ),
            );
        } catch (e) {
            console.error("Failed to send encoding message to peer", e);
        }
    }

    private videoEncodingRetries = 0;

    private retryVideoEncodingLater(): void {
        if (this.videoEncodingRetryTimeout || this.videoEncodingRetries >= 5) {
            return;
        }
        this.videoEncodingRetries++;
        this.videoEncodingRetryTimeout = setTimeout(() => {
            this.videoEncodingRetryTimeout = undefined;
            this.applyVideoEncoding();
        }, 1000);
    }

    private getLocalQualitySetting(): VideoQualitySetting {
        return this.type === "screenSharing" ? get(screenShareQualityStore) : get(videoQualityStore);
    }

    private getPresetForDimensions(width: number, height: number): { bitrate: number; fps: number } {
        return selectVideoPreset(height, width, this.type === "screenSharing", this.getLocalQualitySetting());
    }

    /**
     * Returns the item [0] from the array passed in parameter.
     * If the array is empty, returns undefined.
     * If the array contains more than one item, throw an Error.
     */
    private static getFirstAndOnly<T>(array: T[]): T | undefined {
        if (array.length > 1) {
            throw new Error("Expected array to contain at most one item, but it contained multiple items.");
        }
        return array[0];
    }
}
