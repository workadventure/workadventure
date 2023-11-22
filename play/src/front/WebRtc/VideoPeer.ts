import { Buffer } from "buffer";
import type { Subscription } from "rxjs";
import { Readable, Writable, Unsubscriber, get, readable, writable } from "svelte/store";
import Peer from "simple-peer/simplepeer.min.js";
import type { RoomConnection } from "../Connection/RoomConnection";
import { localStreamStore, videoBandwidthStore } from "../Stores/MediaStore";
import { playersStore } from "../Stores/PlayersStore";
import {
    chatMessagesService,
    newChatMessageSubject,
    newChatMessageWritingStatusSubject,
    writingStatusMessageStore,
} from "../Stores/ChatStore";
import { getIceServersConfig, getSdpTransform } from "../Components/Video/utils";
import { SoundMeter } from "../Phaser/Components/SoundMeter";
import { gameManager } from "../Phaser/Game/GameManager";
import { apparentMediaContraintStore } from "../Stores/ApparentMediaContraintStore";
import type { ConstraintMessage, ObtainedMediaStreamConstraints } from "./P2PMessages/ConstraintMessage";
import type { UserSimplePeerInterface } from "./SimplePeer";
import { blackListManager } from "./BlackListManager";
import { MessageMessage } from "./P2PMessages/MessageMessage";
import { MessageStatusMessage } from "./P2PMessages/MessageStatusMessage";
import { P2PMessage } from "./P2PMessages/P2PMessage";
import { BlockMessage } from "./P2PMessages/BlockMessage";
import { UnblockMessage } from "./P2PMessages/UnblockMessage";

export type PeerStatus = "connecting" | "connected" | "error" | "closed";

/**
 * A peer connection used to transmit video / audio signals between 2 peers.
 */
export class VideoPeer extends Peer {
    public toClose = false;
    public _connected = false;
    public remoteStream!: MediaStream;
    private blocked = false;
    public readonly userId: number;
    public readonly userUuid: string;
    public readonly uniqueId: string;
    private onBlockSubscribe: Subscription;
    private onUnBlockSubscribe: Subscription;
    public readonly streamStore: Writable<MediaStream | null> = writable<MediaStream | null>(null);
    public readonly volumeStore: Readable<number[] | undefined>;
    private readonly _statusStore: Writable<PeerStatus> = writable<PeerStatus>("closed");
    private readonly _constraintsStore: Writable<ObtainedMediaStreamConstraints | null>;
    private newMessageSubscription: Subscription | undefined;
    private closing = false; //this is used to prevent destroy() from being called twice
    private newWritingStatusMessageSubscription: Subscription | undefined;
    private volumeStoreSubscribe?: Unsubscriber;
    private readonly localStreamStoreSubscribe: Unsubscriber;
    private readonly apparentMediaConstraintStoreSubscribe: Unsubscriber;

    constructor(
        public user: UserSimplePeerInterface,
        initiator: boolean,
        public readonly userName: string,
        private connection: RoomConnection
    ) {
        const bandwidth = get(videoBandwidthStore);
        super({
            initiator,
            config: {
                iceServers: getIceServersConfig(user),
            },
            sdpTransform: getSdpTransform(bandwidth === "unlimited" ? undefined : bandwidth),
        });

        this.userId = user.userId;
        this.userUuid = playersStore.getPlayerById(this.userId)?.userUuid || "";
        this.uniqueId = "video_" + this.userId;

        this.volumeStore = readable<number[] | undefined>(undefined, (set) => {
            if (this.volumeStoreSubscribe) {
                this.volumeStoreSubscribe();
            }
            let soundMeter: SoundMeter;
            let timeout: NodeJS.Timeout;

            this.volumeStoreSubscribe = this.streamStore.subscribe((mediaStream) => {
                if (soundMeter) {
                    soundMeter.stop();
                }
                if (mediaStream === null || mediaStream.getAudioTracks().length <= 0) {
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

        //start listen signal for the peer connection
        this.on("signal", (data: unknown) => {
            this.sendWebrtcSignal(data);
        });

        this.on("stream", (stream: MediaStream) => this.stream(stream));

        this.on("close", () => {
            this._statusStore.set("closed");

            this._connected = false;
            this.toClose = true;
            this.destroy();
        });

        this.on("error", (err: Error) => {
            this._statusStore.set("error");

            console.error(`error for user ${this.userId}`, err);
            if ("code" in err) {
                console.error(`error code => ${err.code}`);
            }
        });

        this.on("connect", () => {
            this._statusStore.set("connected");

            this._connected = true;
            chatMessagesService.addIncomingUser(this.userId);

            this.newMessageSubscription = newChatMessageSubject.subscribe((newMessage) => {
                if (!newMessage) return;
                this.write(
                    new Buffer(
                        JSON.stringify({
                            type: "message",
                            message: newMessage,
                        } as MessageMessage)
                    )
                );
            });

            this.newWritingStatusMessageSubscription = newChatMessageWritingStatusSubject.subscribe((status) => {
                if (status === undefined) {
                    return;
                }
                this.write(
                    new Buffer(
                        JSON.stringify({
                            type: "message_status",
                            message: status,
                        } as MessageStatusMessage)
                    )
                );
            });
        });

        this.on("data", (chunk: Buffer) => {
            try {
                const data = JSON.parse(chunk.toString("utf8"));
                const message = P2PMessage.parse(data);
                switch (message.type) {
                    case "constraint": {
                        this._constraintsStore.set(message.message);
                        break;
                    }
                    case "message": {
                        if (!blackListManager.isBlackListed(this.userUuid)) {
                            chatMessagesService.addExternalMessage(this.userId, message.message);
                        }
                        break;
                    }
                    case "message_status": {
                        if (!blackListManager.isBlackListed(this.userUuid)) {
                            writingStatusMessageStore.addWritingStatus(this.userId, message.message);
                        }
                        break;
                    }
                    case "blocked": {
                        //FIXME when A blacklists B, the output stream from A is muted in B's js client. This is insecure since B can manipulate the code to unmute A stream.
                        // Find a way to block A's output stream in A's js client
                        //However, the output stream stream B is correctly blocked in A client
                        this.blocked = true;
                        this.toggleRemoteStream(false);
                        const simplePeer = gameManager.getCurrentGameScene().getSimplePeer();
                        simplePeer.blockedFromRemotePlayer(this.userId);
                        break;
                    }
                    case "unblocked": {
                        this.blocked = false;
                        this.toggleRemoteStream(true);
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
        });

        this.once("finish", () => {
            this._statusStore.set("closed");

            this._onFinish();
        });

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
            this.connection.sendWebrtcSignal(data, this.userId);
        } catch (e) {
            console.error(`sendWebrtcSignal => ${this.userId}`, e);
        }
    }

    /**
     * Sends received stream to screen.
     */
    private stream(stream: MediaStream) {
        this.streamStore.set(stream);

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
            this._connected = false;
            if (!this.toClose || this.closing) {
                return;
            }
            this.closing = true;
            this.onBlockSubscribe.unsubscribe();
            this.onUnBlockSubscribe.unsubscribe();
            this.newMessageSubscription?.unsubscribe();
            this.newWritingStatusMessageSubscription?.unsubscribe();
            chatMessagesService.addOutcomingUser(this.userId);
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
}
