import { Buffer } from "buffer";
import { derived, get, Readable, readable, Unsubscriber, Writable, writable } from "svelte/store";
import Peer from "simple-peer/simplepeer.min.js";
import { ForwardableStore } from "@workadventure/store-utils";
import { IceServer } from "@workadventure/messages";
import { z } from "zod";
import { LocalStreamStoreValue, videoBandwidthStore } from "../Stores/MediaStore";
import { getSdpTransform } from "../Components/Video/utils";
import { SoundMeter } from "../Phaser/Components/SoundMeter";
import { Streamable, WebRtcStreamable } from "../Stores/StreamableCollectionStore";
import { SpaceInterface } from "../Space/SpaceInterface";
import { decrementWebRtcConnectionsCount, incrementWebRtcConnectionsCount } from "../Utils/E2EHooks";
import { deriveSwitchStore } from "../Stores/InterruptorStore";
import type { ConstraintMessage, ObtainedMediaStreamConstraints } from "./P2PMessages/ConstraintMessage";
import type { UserSimplePeerInterface } from "./SimplePeer";
import { isFirefox } from "./DeviceUtils";
import { P2PMessage, STREAM_STOPPED_MESSAGE_TYPE, StreamStoppedMessage } from "./P2PMessages/P2PMessage";
import { BlockMessage } from "./P2PMessages/BlockMessage";
import { UnblockMessage } from "./P2PMessages/UnblockMessage";

export type PeerStatus = "connecting" | "connected" | "error" | "closed";

// Firefox needs more time for ICE negotiation
const CONNECTION_TIMEOUT = isFirefox() ? 10000 : 5000; // 10s for Firefox, 5s for others

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
    private readonly _streamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    public readonly volumeStore: Readable<number[] | undefined>;
    private readonly _statusStore: Writable<PeerStatus> = writable<PeerStatus>("connecting");
    private readonly _constraintsStore: Writable<ObtainedMediaStreamConstraints | null>;
    private closing = false; //this is used to prevent destroy() from being called twice
    private volumeStoreSubscribe?: Unsubscriber;
    private readonly localStreamStoreSubscribe: Unsubscriber;
    private readonly apparentMediaConstraintStoreSubscribe: Unsubscriber;
    private readonly _hasVideo: Readable<boolean>;
    private readonly _isMuted: Readable<boolean>;
    private readonly showVoiceIndicatorStore: ForwardableStore<boolean> = new ForwardableStore(false);
    public readonly flipX = false;
    public readonly muteAudio = false;
    private readonly _hasAudio: Readable<boolean>;
    public readonly displayMode: "fit" | "cover";
    public readonly usePresentationMode: boolean;
    public readonly displayInPictureInPictureMode = true;
    public isReceivingStream = false;
    private readonly _name: Readable<string>;
    private readonly _isBlocked: Readable<boolean>;
    private closeStreamableTimeout: ReturnType<typeof setTimeout> | undefined;

    /**
     * Set to true when closeStreamable() is called.
     * When preparingClose is true, we don't stop immediately sending our stream. Instead, we wait for the remote peer to
     * send a message on the data channel to inform us that it has stopped sending its own stream.
     * When this message is received, we can then close the peer connection.
     */
    private preparingClose = false;

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

        /*const proximityRoomChat = gameManager.getCurrentGameScene().proximityChatRoom;

        if (proximityRoomChat.addIncomingUser != undefined) {
            const color = playersStore.getPlayerById(this.userId)?.color;
            proximityRoomChat.addIncomingUser(this.userId, this.userUuid, this.player.name, color ?? undefined);
        }*/
    };

    private readonly dataHandler = (chunk: Buffer) => {
        try {
            const data = JSON.parse(chunk.toString("utf8"));
            const message = P2PMessage.parse(data);

            switch (message.type) {
                case "constraint": {
                    this._constraintsStore.set(message.message);
                    break;
                }
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
    private localAudioTrack: MediaStreamAudioTrack | undefined;
    private localVideoTrack: MediaStreamVideoTrack | undefined;

    constructor(
        public user: UserSimplePeerInterface,
        initiator: boolean,
        private space: SpaceInterface,
        private iceServers: IceServer[],
        //private spaceUser: SpaceUserExtended,
        isLocalPeer: boolean,
        private localStreamStore: Readable<LocalStreamStoreValue>,
        private type: "video" | "screenSharing",
        private _spaceUserId: string,
        private _blockedUsersStore: Readable<Set<string>>,
        private onDestroy: () => void,
        private _apparentMediaContraintStore: Readable<ObtainedMediaStreamConstraints>
    ) {
        incrementWebRtcConnectionsCount();
        const bandwidth = get(videoBandwidthStore);
        const firefoxBrowser = isFirefox();

        // Firefox-specific configuration
        const peerConfig = {
            initiator,
            config: {
                iceServers,
                // Firefox benefits from these additional settings
                ...(firefoxBrowser && {
                    iceCandidatePoolSize: 10,
                    bundlePolicy: "max-bundle" as RTCBundlePolicy,
                    rtcpMuxPolicy: "require" as RTCRtcpMuxPolicy,
                }),
            },
            sdpTransform: getSdpTransform(bandwidth === "unlimited" ? undefined : bandwidth),
            // Firefox works better with trickle ICE enabled
            ...(firefoxBrowser && { trickle: true }),
        };
        super(peerConfig);

        this._hasAudio = writable<boolean>(type === "video");
        this.displayMode = type === "video" ? "cover" : "fit";
        this.usePresentationMode = !(type === "video");
        //this.userUuid = spaceUser.uuid;
        this.uniqueId = isLocalPeer
            ? "localScreenSharingStream"
            : type === "video"
            ? "video_" + _spaceUserId
            : "screensharing_" + _spaceUserId;
        this._name = writable(this.space.getSpaceUserBySpaceUserId(this._spaceUserId)?.name ?? "Unknown");

        this.volumeStore = readable<number[] | undefined>(undefined, (set) => {
            if (this.volumeStoreSubscribe) {
                this.volumeStoreSubscribe();
            }
            let soundMeter: SoundMeter;
            let timeout: NodeJS.Timeout;

            this.volumeStoreSubscribe = this._streamStore.subscribe((mediaStream) => {
                if (soundMeter) {
                    soundMeter.stop();
                }
                if (mediaStream === undefined || mediaStream.getAudioTracks().length <= 0) {
                    set(undefined);
                    return;
                }
                soundMeter = new SoundMeter(mediaStream);
                let error = false;

                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setInterval(() => {
                    try {
                        set(soundMeter?.getVolume());
                    } catch (err) {
                        if (!error) {
                            console.error(err);
                            error = true;
                        }
                    }
                }, 100);
            });

            return () => {
                set(undefined);
                if (soundMeter) {
                    soundMeter.stop();
                }
                if (timeout) {
                    clearTimeout(timeout);
                }
            };
        });

        this._constraintsStore = writable<ObtainedMediaStreamConstraints | null>(null);

        this._hasVideo = derived(this._constraintsStore, ($constraintStore) => {
            return $constraintStore?.video ?? false;
        });
        this._isMuted = derived(this._constraintsStore, ($constraintStore) => {
            return !$constraintStore?.audio;
        });

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
            this.space.isStreamingStore
        ).subscribe((streamValue) => {
            if (streamValue === undefined) {
                if (this.localStream) {
                    this.removeStream(this.localStream);
                }
                this.localStream = undefined;
                return;
            }
            if (streamValue.type === "success") {
                let newVideoTrack: MediaStreamVideoTrack | undefined;
                let newAudioTrack: MediaStreamAudioTrack | undefined;
                if (streamValue.stream) {
                    if (this.localStream) {
                        newVideoTrack = streamValue.stream.getVideoTracks()[0];

                        if (newVideoTrack && this.localVideoTrack && newVideoTrack.id !== this.localVideoTrack.id) {
                            this.replaceTrack(this.localVideoTrack, newVideoTrack, this.localStream);
                        } else if (newVideoTrack && !this.localVideoTrack) {
                            this.addTrack(newVideoTrack, this.localStream);
                        } else if (
                            newVideoTrack &&
                            this.localVideoTrack &&
                            newVideoTrack.id === this.localVideoTrack.id &&
                            !this.localVideoTrack.enabled
                        ) {
                            this.localVideoTrack.enabled = true;
                            newVideoTrack = this.localVideoTrack;
                        } else if (this.localVideoTrack && !newVideoTrack) {
                            this.localVideoTrack.enabled = false;
                            newVideoTrack = this.localVideoTrack;
                        }

                        newAudioTrack = streamValue.stream.getAudioTracks()[0];

                        if (newAudioTrack && this.localAudioTrack && newAudioTrack.id !== this.localAudioTrack.id) {
                            this.replaceTrack(this.localAudioTrack, newAudioTrack, this.localStream);
                        } else if (newAudioTrack && !this.localAudioTrack) {
                            this.addTrack(newAudioTrack, this.localStream);
                        } else if (
                            newAudioTrack &&
                            this.localAudioTrack &&
                            newAudioTrack.id === this.localAudioTrack.id &&
                            !this.localAudioTrack.enabled
                        ) {
                            // Only re-enable the track if the new track is also enabled
                            // If the new track is disabled, it means the user explicitly muted, so we should preserve that state
                            if (newAudioTrack.enabled) {
                                this.localAudioTrack.enabled = true;
                            }
                            newAudioTrack = this.localAudioTrack;
                        } else if (this.localAudioTrack && !newAudioTrack) {
                            this.localAudioTrack.enabled = false;
                            newAudioTrack = this.localAudioTrack;
                        }
                    } else {
                        this.addStream(streamValue.stream);
                        this.localStream = streamValue.stream;
                        newAudioTrack = streamValue.stream.getAudioTracks()[0];
                        newVideoTrack = streamValue.stream.getVideoTracks()[0];
                    }
                    this.localAudioTrack = newAudioTrack;
                    this.localVideoTrack = newVideoTrack;
                } else {
                    if (this.localStream) {
                        if (this.localAudioTrack) {
                            this.localAudioTrack.enabled = false;
                        }
                        if (this.localVideoTrack) {
                            this.localVideoTrack.enabled = false;
                        }
                    }
                }
            } else {
                if (this.localStream) {
                    if (this.localAudioTrack) {
                        this.localAudioTrack.enabled = false;
                    }
                    if (this.localVideoTrack) {
                        this.localVideoTrack.enabled = false;
                    }
                }
            }
        });

        this.apparentMediaConstraintStoreSubscribe = this._apparentMediaContraintStore.subscribe((constraints) => {
            this.write(
                new Buffer(
                    JSON.stringify({
                        type: "constraint",
                        message: constraints,
                    } as ConstraintMessage)
                )
            );
        });

        const showVoiceIndicator = this.space.getSpaceUserBySpaceUserId(this._spaceUserId)?.reactiveUser
            .showVoiceIndicator;
        if (showVoiceIndicator && this.type === "video") {
            this.showVoiceIndicatorStore.forward(showVoiceIndicator);
        }
    }

    private sendBlockMessage(blocking: boolean) {
        this.write(
            new Buffer(
                JSON.stringify({
                    type: blocking ? "blocked" : "unblocked",
                } as BlockMessage | UnblockMessage)
            )
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
                        },
                    },
                    this.user.userId
                );
            } else {
                this.space.emitPrivateMessage(
                    {
                        $case: "webRtcScreenSharingSignal",
                        webRtcScreenSharingSignal: {
                            signal: JSON.stringify(data),
                        },
                    },
                    this.user.userId
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
        this._streamStore.set(stream);
        try {
            this.remoteStream = stream;
            if (this.blocked) {
                this.toggleRemoteStream(false);
            }
        } catch (err) {
            console.error(err);
        }

        if (!stream) {
            this.isReceivingStream = false;
        } else {
            this.isReceivingStream = true;
        }
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    public destroy(error?: Error): void {
        try {
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

            this._connected = false;
            if (this.closing) {
                return;
            }
            this.closing = true;

            decrementWebRtcConnectionsCount();

            // Unsubscribe from subscriptions
            // this.onBlockSubscribe.unsubscribe();
            // this.onUnBlockSubscribe.unsubscribe();

            this.localStreamStoreSubscribe();
            this.apparentMediaConstraintStoreSubscribe();
            this.volumeStoreSubscribe?.();
            this.volumeStoreSubscribe = undefined;

            this.localStream?.removeEventListener("addtrack", this.sendContraintsForLocalStream);
            this.localStream?.removeEventListener("removetrack", this.sendContraintsForLocalStream);

            super.destroy(error);

            this.onDestroy();
        } catch (err) {
            console.error("VideoPeer::destroy", err);
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

    get constraintsStore(): Readable<ObtainedMediaStreamConstraints | null> {
        return this._constraintsStore;
    }

    get statusStore(): Readable<PeerStatus> {
        return this._statusStore;
    }

    get streamStore(): Readable<MediaStream | undefined> {
        return this._streamStore;
    }

    get media(): WebRtcStreamable {
        return {
            type: "webrtc",
            streamStore: this._streamStore,
            isBlocked: this._isBlocked,
        };
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
                } as StreamStoppedMessage)
            )
        );
    }

    public isReceivingScreenSharingStream(): boolean {
        return this.isReceivingStream;
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
        return this._name;
    }

    get showVoiceIndicator(): Readable<boolean> {
        return this.showVoiceIndicatorStore;
    }

    get spaceUserId(): string | undefined {
        return this._spaceUserId;
    }

    private sendContraintsForLocalStream = () => {
        if (this.localStream) {
            this.write(
                new Buffer(
                    JSON.stringify({
                        type: "constraint",
                        message: {
                            audio: this.localStream.getAudioTracks().length > 0,
                            video: this.localStream.getVideoTracks().length > 0,
                        },
                    } as ConstraintMessage)
                )
            );
        }
    };

    /**
     * Sends the given media stream to the peer.
     * Will also dispatch the correct constraint message.
     */
    public dispatchStream(mediaStream: MediaStream): void {
        if (this.localStream) {
            this.removeStream(this.localStream);
            this.localStream.removeEventListener("addtrack", this.sendContraintsForLocalStream);
            this.localStream.removeEventListener("removetrack", this.sendContraintsForLocalStream);
        }
        this.localStream = mediaStream;

        const sendConstraints = () => {
            this.write(
                new Buffer(
                    JSON.stringify({
                        type: "constraint",
                        message: {
                            audio: mediaStream.getAudioTracks().length > 0,
                            video: mediaStream.getVideoTracks().length > 0,
                        },
                    } as ConstraintMessage)
                )
            );
        };

        sendConstraints();
        mediaStream.addEventListener("addtrack", sendConstraints);
        mediaStream.addEventListener("removetrack", sendConstraints);

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
        if (this._connected) {
            this.write(
                Buffer.from(
                    JSON.stringify({
                        type: STREAM_STOPPED_MESSAGE_TYPE,
                    } as StreamStoppedMessage)
                )
            );
        }
        this.closeStreamableTimeout = setTimeout(() => {
            if (!this.destroyed) {
                this.destroy();
            }
        }, 5000);
    }
}
