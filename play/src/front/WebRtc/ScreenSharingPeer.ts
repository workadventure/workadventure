import { Buffer } from "buffer";
import { get, Readable, Writable, writable } from "svelte/store";
import Peer from "simple-peer/simplepeer.min.js";
import { SignalData } from "simple-peer";
import * as Sentry from "@sentry/svelte";
import { z } from "zod";
import { getIceServersConfig, getSdpTransform } from "../Components/Video/utils";
import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
import { screenShareBandwidthStore } from "../Stores/ScreenSharingStore";
import { RemotePlayerData } from "../Phaser/Game/RemotePlayersRepository";
import { MediaStoreStreamable, Streamable } from "../Stores/StreamableCollectionStore";
import { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import type { PeerStatus } from "./VideoPeer";
import type { UserSimplePeerInterface } from "./SimplePeer";
import {
    STREAM_ENDED_MESSAGE_TYPE,
    STREAM_STOPPED_MESSAGE_TYPE,
    StreamEndedMessage,
    StreamMessage,
    StreamStoppedMessage,
} from "./P2PMessages/StreamEndedMessage";
import { customWebRTCLogger } from "./CustomWebRTCLogger";
import { isFirefox } from "./DeviceUtils";

// Firefox needs more time for ICE negotiation in screen sharing
const CONNECTION_TIMEOUT = isFirefox() ? 10000 : 5000;

/**
 * A peer connection used to transmit video / audio signals between 2 peers.
 */
export class ScreenSharingPeer extends Peer implements Streamable {
    /**
     * Whether this connection is currently receiving a video stream from a remote user.
     */
    private isReceivingStream = false;
    public toClose = false;
    public _connected = false;
    public readonly userId: number;
    public readonly uniqueId: string;
    private readonly _streamStore: Writable<MediaStream | undefined>;
    private readonly _statusStore: Writable<PeerStatus>;
    private readonly _hasAudio = writable<boolean>(false);
    private readonly _hasVideo: Readable<boolean>;
    private readonly _isMuted: Readable<boolean>;
    // No volume in a screen sharing
    public readonly volumeStore: Readable<number[] | undefined> | undefined = undefined;
    private readonly _pictureStore: Writable<string | undefined> = writable<string | undefined>(undefined);
    public readonly flipX = false;
    public readonly muteAudio = false;
    public readonly displayMode = "fit";
    public readonly displayInPictureInPictureMode = true;
    public readonly usePresentationMode = true;
    constructor(
        public user: UserSimplePeerInterface,
        initiator: boolean,
        public readonly player: RemotePlayerData,
        stream: MediaStream | undefined,
        private space: SpaceInterface,
        private spaceUser: SpaceUserExtended,
        isLocalScreenSharing: boolean
    ) {
        const bandwidth = get(screenShareBandwidthStore);
        const firefoxBrowser = isFirefox();

        // Firefox-specific configuration for screen sharing
        const peerConfig = {
            initiator,
            config: {
                iceServers: getIceServersConfig(user),
                // Firefox benefits from these additional settings for screen sharing
                ...(firefoxBrowser && {
                    iceCandidatePoolSize: 15, // Higher pool for screen sharing
                    bundlePolicy: "max-bundle" as RTCBundlePolicy,
                    rtcpMuxPolicy: "require" as RTCRtcpMuxPolicy,
                }),
            },
            sdpTransform: getSdpTransform(bandwidth === "unlimited" ? undefined : bandwidth),
            // Firefox works better with trickle ICE enabled for screen sharing
            ...(firefoxBrowser && { trickle: true }),
        };

        super(peerConfig);

        this.userId = player.userId;
        this.uniqueId = isLocalScreenSharing ? "localScreenSharingStream" : "screensharing_" + this.userId;

        let connectTimeout: ReturnType<typeof setTimeout> | undefined;

        this._streamStore = writable<MediaStream | undefined>(undefined);

        // Event listeners are valid for the lifetime of the object and will be garbage collected when the object is destroyed
        /* eslint-disable listeners/no-missing-remove-event-listener, listeners/no-inline-function-event-listener */

        this.on("data", (chunk: Buffer) => {
            try {
                const data = JSON.parse(chunk.toString("utf8"));

                // The only message type we can send is a StreamEndedMessage
                StreamMessage.parse(data);
                this._streamStore.set(undefined);
                switch (data.type) {
                    case STREAM_STOPPED_MESSAGE_TYPE: {
                        if (this.isReceivingStream) {
                            this.isReceivingStream = false;
                        } else {
                            this.close();
                        }
                        break;
                    }
                    case STREAM_ENDED_MESSAGE_TYPE: {
                        this.close();
                        break;
                    }
                }
            } catch (e) {
                console.error("Unexpected P2P screen sharing message received from peer: ", e);
                this._statusStore.set("error");
            }
        });

        this._statusStore = writable<PeerStatus>("connecting");

        //start listen signal for the peer connection
        this.on("signal", (data: SignalData) => {
            // transform sdp to force to use h264 codec
            this.sendWebrtcScreenSharingSignal(data);

            const ZodCandidate = z.object({
                type: z.literal("candidate"),
            });
            if (ZodCandidate.safeParse(data).success && get(this._statusStore) === "connecting") {
                // If the signal is a candidate, we set a connection timer
                if (connectTimeout) {
                    clearTimeout(connectTimeout);
                }
                connectTimeout = setTimeout(() => {
                    this._statusStore.set("error");
                }, CONNECTION_TIMEOUT);
            }
        });

        this.on("stream", (stream: MediaStream) => {
            highlightedEmbedScreen.toggleHighlight(this);
            this._streamStore.set(stream);
            this.stream(stream);

            // Set the max bitrate for the video stream
            this.setMaxBitrate().catch((err) => console.error("setMaxBitrate error", err));

            this._hasAudio.set(stream.getAudioTracks().length > 0);
        });

        this.on("close", () => {
            this.close();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.on("error", (err: any) => {
            console.error(`screen sharing error => ${this.userId} => ${err.code}`, err);
            this._statusStore.set("error");

            // Firefox-specific error handling for screen sharing
            if (isFirefox() && err.message) {
                // Log Firefox-specific screen sharing errors for better debugging
                if (err.message.includes("ICE")) {
                    console.warn("Firefox screen sharing ICE connection error - this may be temporary");
                } else if (err.message.includes("DTLS")) {
                    console.warn("Firefox screen sharing DTLS handshake error - checking TURN configuration");
                } else if (err.message.includes("getDisplayMedia")) {
                    console.warn("Firefox screen sharing capture error - check permissions");
                }
            }
        });

        this.on("connect", () => {
            if (connectTimeout) {
                clearTimeout(connectTimeout);
            }
            this._connected = true;
            customWebRTCLogger.info(`connect => ${this.userId}`);
            this._statusStore.set("connected");

            // Set the max bitrate for the video stream
            this.setMaxBitrate().catch((err) => console.error("setMaxBitrate error", err));
        });

        this.once("finish", () => {
            this._onFinish();
        });

        if (stream) {
            this.addStream(stream);
        }

        this._hasVideo = writable<boolean>(true);
        this._isMuted = writable<boolean>(false);

        this.getExtendedSpaceUser()
            .then((spaceUser) => {
                this._pictureStore.set(spaceUser.getWokaBase64);
            })
            .catch((e) => {
                console.error("Error while getting extended space user", e);
                Sentry.captureException(e);
            });
    }

    private close() {
        this.isReceivingStream = false;
        this._statusStore.set("closed");
        this._connected = false;
        this.toClose = true;
        this.destroy();
    }

    private sendWebrtcScreenSharingSignal(data: unknown) {
        try {
            this.space.emitPrivateMessage(
                {
                    $case: "webRtcScreenSharingSignalToServerMessage",
                    webRtcScreenSharingSignalToServerMessage: {
                        // receiverId: this.userId,
                        signal: JSON.stringify(data),
                    },
                },
                this.user.userId
            );
        } catch (e) {
            console.error(`sendWebrtcScreenSharingSignal => ${this.userId}`, e);
        }
    }

    /**
     * Sends received stream to screen.
     */
    private stream(stream?: MediaStream) {
        if (!stream) {
            this.isReceivingStream = false;
        } else {
            //Check if the peer connection is already connected status. In this case, the status store must be set to 'connected'.
            //In the case or player A send stream and player B send a stream, it's same peer connection, also the status must be changed to connect.
            //TODO add event listening when the stream is ready for displaying and change the status
            if (this._connected) {
                this._statusStore.set("connected");
            }
            this.isReceivingStream = true;
        }
    }

    public isReceivingScreenSharingStream(): boolean {
        return this.isReceivingStream;
    }

    public destroy(error?: Error): void {
        try {
            this._connected = false;
            if (!this.toClose) {
                return;
            }
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            super.destroy(error);
        } catch (err) {
            console.error("ScreenSharingPeer::destroy", err);
        }
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

    public stopPushingScreenSharingToRemoteUser(stream: MediaStream) {
        this.removeStream(stream);
        this.write(
            new Buffer(
                JSON.stringify({
                    type: STREAM_STOPPED_MESSAGE_TYPE,
                } as StreamStoppedMessage)
            )
        );
    }

    public finishScreenSharingToRemoteUser() {
        this.write(
            new Buffer(
                JSON.stringify({
                    type: STREAM_ENDED_MESSAGE_TYPE,
                } as StreamEndedMessage)
            )
        );
    }

    public get statusStore(): Readable<PeerStatus> {
        return this._statusStore;
    }

    get streamStore(): Readable<MediaStream | undefined> {
        return this._streamStore;
    }

    public async getExtendedSpaceUser(): Promise<SpaceUserExtended> {
        return this.space.extendSpaceUser(this.spaceUser);
    }

    get media(): MediaStoreStreamable {
        const videoElementUnsubscribers = new Map<HTMLVideoElement, () => void>();
        return {
            type: "mediaStore",
            streamStore: this._streamStore,
            attach: (container: HTMLVideoElement) => {
                const unsubscribe = this._streamStore.subscribe((stream) => {
                    if (stream) {
                        container.srcObject = stream;
                    }
                });
                videoElementUnsubscribers.set(container, unsubscribe);
            },
            detach: (container: HTMLVideoElement) => {
                container.srcObject = null;
                const unsubscribe = videoElementUnsubscribers.get(container);
                if (unsubscribe) {
                    unsubscribe();
                    videoElementUnsubscribers.delete(container);
                }
            },
        };
    }

    get hasVideo(): Readable<boolean> {
        return this._hasVideo;
    }

    get hasAudio(): Readable<boolean> {
        return this._hasAudio;
    }

    get isMuted(): Readable<boolean> {
        return this._isMuted;
    }

    get name(): Readable<string> {
        return writable(this.player.name);
    }

    get showVoiceIndicator(): Readable<boolean> {
        return writable(false);
    }

    get pictureStore(): Readable<string | undefined> {
        return this._pictureStore;
    }

    private async setMaxBitrate() {
        try {
            // Get the RTCPeerConnection instance
            const pc = (this as unknown as { _pc: RTCPeerConnection })._pc;
            if (!pc) {
                customWebRTCLogger.warn("RTCPeerConnection not found.");
                return;
            }
            const promise: Promise<unknown>[] = [];
            for (const sender of pc.getSenders()) {
                const parameters = sender.getParameters();
                for (const encoding of parameters.encodings) {
                    encoding.scaleResolutionDownBy = 2.0;
                    encoding.maxBitrate = 1_500_000; // 1.5 Mbps
                    encoding.maxFramerate = 30; // 30 fps
                    encoding.priority = "high";
                    encoding.networkPriority = "high";
                }
                customWebRTCLogger.info(
                    "setMaxBitrate => Setting max bitrate to 1.5 Mbps and max framerate to 30 fps.",
                    parameters
                );
                promise.push(sender.setParameters(parameters));
            }
            await Promise.all(promise);
        } catch (e) {
            console.error("setMaxBitrate => Error setting max bitrate:", e);
        }
    }
}
