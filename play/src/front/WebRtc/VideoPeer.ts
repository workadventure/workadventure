import { Buffer } from "buffer";
import type { Subscription } from "rxjs";
import { derived, get, Readable, readable, Unsubscriber, Writable, writable } from "svelte/store";
import Peer from "simple-peer/simplepeer.min.js";
import { ForwardableStore } from "@workadventure/store-utils";
import * as Sentry from "@sentry/svelte";
import { z } from "zod";
import { localStreamStore, videoBandwidthStore } from "../Stores/MediaStore";
import { playersStore } from "../Stores/PlayersStore";
import { getIceServersConfig, getSdpTransform } from "../Components/Video/utils";
import { SoundMeter } from "../Phaser/Components/SoundMeter";
import { apparentMediaContraintStore } from "../Stores/ApparentMediaContraintStore";
import { RemotePlayerData } from "../Phaser/Game/RemotePlayersRepository";
import { MediaStoreStreamable, Streamable } from "../Stores/StreamableCollectionStore";
import { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import type { ConstraintMessage, ObtainedMediaStreamConstraints } from "./P2PMessages/ConstraintMessage";
import type { UserSimplePeerInterface } from "./SimplePeer";
import { blackListManager } from "./BlackListManager";
import { P2PMessage } from "./P2PMessages/P2PMessage";
import { BlockMessage } from "./P2PMessages/BlockMessage";
import { UnblockMessage } from "./P2PMessages/UnblockMessage";

export type PeerStatus = "connecting" | "connected" | "error" | "closed";

const CONNECTION_TIMEOUT = 5000;

/**
 * A peer connection used to transmit video / audio signals between 2 peers.
 */
export class VideoPeer extends Peer implements Streamable {
    public toClose = false;
    public _connected = false;
    public remoteStream!: MediaStream;
    private blocked = false;
    public readonly userId: number;
    public readonly userUuid: string;
    public readonly uniqueId: string;
    private onBlockSubscribe: Subscription;
    private onUnBlockSubscribe: Subscription;
    private readonly _streamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    public readonly volumeStore: Readable<number[] | undefined>;
    private readonly _statusStore: Writable<PeerStatus> = writable<PeerStatus>("connecting");
    private readonly _constraintsStore: Writable<ObtainedMediaStreamConstraints | null>;
    private newMessageSubscription: Subscription | undefined;
    private closing = false; //this is used to prevent destroy() from being called twice
    private volumeStoreSubscribe?: Unsubscriber;
    private readonly localStreamStoreSubscribe: Unsubscriber;
    private readonly apparentMediaConstraintStoreSubscribe: Unsubscriber;
    private readonly _hasAudio = writable<boolean>(true);
    private readonly _hasVideo: Readable<boolean>;
    private readonly _isMuted: Readable<boolean>;
    private readonly showVoiceIndicatorStore: ForwardableStore<boolean> = new ForwardableStore(false);
    private readonly _pictureStore: Writable<string | undefined> = writable<string | undefined>(undefined);
    public readonly flipX = false;
    public readonly muteAudio = false;
    public readonly displayMode = "cover";
    public readonly displayInPictureInPictureMode = true;
    public readonly usePresentationMode = false;

    // Store event listener functions for proper cleanup
    private readonly signalHandler = (data: unknown) => {
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

        this._connected = false;
        this.toClose = true;
        this.destroy();
    };

    private readonly errorHandler = (err: Error) => {
        this._statusStore.set("error");

        console.error(`error for user ${this.userId}`, err);
        if ("code" in err) {
            console.error(`error code => ${err.code}`);
        }
    };

    private readonly iceTimeoutHandler = () => {
        this._statusStore.set("error");
    };

    private readonly connectHandler = () => {
        if (this.connectTimeout) {
            clearTimeout(this.connectTimeout);
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

            (async () => {
                switch (message.type) {
                    case "constraint": {
                        this._constraintsStore.set(message.message);
                        break;
                    }
                    case "blocked": {
                        //FIXME when A blacklists B, the output stream from A is muted in B's js client. This is insecure since B can manipulate the code to unmute A stream.
                        // Find a way to block A's output stream in A's js client
                        //However, the output stream stream B is correctly blocked in A client
                        this.blocked = true;
                        this.toggleRemoteStream(false);
                        const simplePeer = this.space.simplePeer;
                        const spaceUser = await this.space.getSpaceUserByUserId(this.userId);
                        if (!spaceUser) {
                            console.error("spaceUser not found for userId", this.userId);
                            return;
                        }
                        if (!spaceUser) {
                            console.error("spaceUser not found for userId", this.userId);
                            return;
                        }
                        const spaceUserId = spaceUser.spaceUserId;
                        if (!spaceUserId) {
                            console.error("spaceUserId not found for userId", this.userId);
                            return;
                        }
                        if (simplePeer) {
                            simplePeer.blockedFromRemotePlayer(spaceUserId);
                        }
                        break;
                    }
                    case "unblocked": {
                        this.blocked = false;
                        this.toggleRemoteStream(true);
                        break;
                    }
                    case "kickoff": {
                        if (message.value !== this.userUuid) break;
                        this._statusStore.set("closed");
                        this._connected = false;
                        this.toClose = true;
                        this._onFinish();
                        this.destroy();
                        break;
                    }
                    default: {
                        const _exhaustiveCheck: never = message;
                    }
                }
            })().catch((e) => {
                console.error("Error while handling P2P message", e);
            });
        } catch (e) {
            console.error("Unexpected P2P message received from peer: ", e);
            this._statusStore.set("error");
        }
    };

    private readonly finishHandler = () => {
        this._statusStore.set("closed");

        this._onFinish();
    };

    private connectTimeout: ReturnType<typeof setTimeout> | undefined;

    constructor(
        public user: UserSimplePeerInterface,
        initiator: boolean,
        //TODO : remove player passer les infos dnas le spaceUser
        public readonly player: RemotePlayerData,
        private space: SpaceInterface,
        private spaceUser: SpaceUserExtended
    ) {
        const bandwidth = get(videoBandwidthStore);
        super({
            initiator,
            config: {
                iceServers: getIceServersConfig(user),
            },
            sdpTransform: getSdpTransform(bandwidth === "unlimited" ? undefined : bandwidth),
        });

        this.userId = player.userId;
        this.userUuid = playersStore.getPlayerById(this.userId)?.userUuid || "";
        this.uniqueId = "video_" + this.userId;

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

        this.onBlockSubscribe = blackListManager.onBlockStream.subscribe((userUuid) => {
            if (userUuid === this.userUuid) {
                this.toggleRemoteStream(false);
                this.sendBlockMessage(true);
            }
        });
        this.onUnBlockSubscribe = blackListManager.onUnBlockStream.subscribe((userUuid) => {
            if (userUuid === this.userUuid) {
                this.toggleRemoteStream(true);
                this.sendBlockMessage(false);
            }
        });

        if (blackListManager.isBlackListed(this.userUuid)) {
            this.sendBlockMessage(true);
        }

        this.localStreamStoreSubscribe = localStreamStore.subscribe((streamValue) => {
            if (streamValue.type === "success" && streamValue.stream) this.addStream(streamValue.stream);
        });
        this.apparentMediaConstraintStoreSubscribe = apparentMediaContraintStore.subscribe((constraints) => {
            this.write(
                new Buffer(
                    JSON.stringify({
                        type: "constraint",
                        message: constraints,
                    } as ConstraintMessage)
                )
            );
        });

        this.getExtendedSpaceUser()
            .then((spaceUser) => {
                this.showVoiceIndicatorStore.forward(spaceUser.reactiveUser.showVoiceIndicator);
                this._pictureStore.set(spaceUser.getWokaBase64);
            })
            .catch((e) => {
                console.error("Error while getting extended space user", e);
                Sentry.captureException(e);
            });
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

    private toggleRemoteStream(enable: boolean) {
        this.remoteStream.getTracks().forEach((track) => (track.enabled = enable));
    }

    private sendWebrtcSignal(data: unknown) {
        try {
            this.space.emitPrivateMessage(
                {
                    $case: "webRtcSignalToServerMessage",
                    webRtcSignalToServerMessage: {
                        //receiverId: this.userId,
                        signal: JSON.stringify(data),
                    },
                },
                this.user.userId
            );
        } catch (e) {
            console.error(`sendWebrtcSignal => ${this.userId}`, e);
        }
    }

    /**
     * Sends received stream to screen.
     */
    private stream(stream: MediaStream) {
        this._streamStore.set(stream);

        try {
            this.remoteStream = stream;
            if (blackListManager.isBlackListed(this.userUuid) || this.blocked) {
                this.toggleRemoteStream(false);
            }
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    public destroy(): void {
        try {
            this.off("signal", this.signalHandler);
            this.off("stream", this.streamHandler);
            this.off("close", this.closeHandler);
            this.off("error", this.errorHandler);
            this.off("iceTimeout", this.iceTimeoutHandler);
            this.off("connect", this.connectHandler);
            this.off("data", this.dataHandler);
            this.off("finish", this.finishHandler);

            this._connected = false;
            if (!this.toClose || this.closing) {
                return;
            }
            this.closing = true;

            // Unsubscribe from subscriptions
            this.onBlockSubscribe.unsubscribe();
            this.onUnBlockSubscribe.unsubscribe();
            this.newMessageSubscription?.unsubscribe();

            if (this.localStreamStoreSubscribe) this.localStreamStoreSubscribe();
            if (this.apparentMediaConstraintStoreSubscribe) this.apparentMediaConstraintStoreSubscribe();
            if (this.volumeStoreSubscribe) this.volumeStoreSubscribe();
            super.destroy();
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

    public async getExtendedSpaceUser(): Promise<SpaceUserExtended> {
        return this.space.extendSpaceUser(this.spaceUser);
        //return lookupUserById(this.userId, this.space, 30_000);
    }

    get streamStore(): Readable<MediaStream | undefined> {
        return this._streamStore;
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
                const videoElements =
                    this.space.spacePeerManager.videoContainerMap.get(this.spaceUser.spaceUserId) || [];
                videoElements.push(container);
                this.space.spacePeerManager.videoContainerMap.set(this.spaceUser.spaceUserId, videoElements);
                videoElementUnsubscribers.set(container, unsubscribe);
            },
            detach: (container: HTMLVideoElement) => {
                container.srcObject = null;
                let videoElements = this.space.spacePeerManager.videoContainerMap.get(this.spaceUser.spaceUserId) || [];
                videoElements = videoElements.filter((element) => element !== container);
                this.space.spacePeerManager.videoContainerMap.set(this.spaceUser.spaceUserId, videoElements);
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
        return this.showVoiceIndicatorStore;
    }

    get pictureStore(): Readable<string | undefined> {
        return this._pictureStore;
    }
}
