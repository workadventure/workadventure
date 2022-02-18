import type * as SimplePeerNamespace from "simple-peer";
import { mediaManager } from "./MediaManager";
import type { RoomConnection } from "../Connexion/RoomConnection";
import { blackListManager } from "./BlackListManager";
import type { Subscription } from "rxjs";
import type { UserSimplePeerInterface } from "./SimplePeer";
import { readable, Readable, Unsubscriber } from "svelte/store";
import { localStreamStore, obtainedMediaConstraintStore, ObtainedMediaStreamConstraints } from "../Stores/MediaStore";
import { playersStore } from "../Stores/PlayersStore";
import { chatMessagesStore, newChatMessageSubject } from "../Stores/ChatStore";
import { getIceServersConfig } from "../Components/Video/utils";
import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";

const Peer: SimplePeerNamespace.SimplePeer = require("simple-peer");

export type PeerStatus = "connecting" | "connected" | "error" | "closed";

export const MESSAGE_TYPE_CONSTRAINT = "constraint";
export const MESSAGE_TYPE_MESSAGE = "message";
export const MESSAGE_TYPE_BLOCKED = "blocked";
export const MESSAGE_TYPE_UNBLOCKED = "unblocked";
/**
 * A peer connection used to transmit video / audio signals between 2 peers.
 */
export class VideoPeer extends Peer {
    public toClose: boolean = false;
    public _connected: boolean = false;
    private remoteStream!: MediaStream;
    private blocked: boolean = false;
    public readonly userId: number;
    public readonly userUuid: string;
    public readonly uniqueId: string;
    private onBlockSubscribe: Subscription;
    private onUnBlockSubscribe: Subscription;
    public readonly streamStore: Readable<MediaStream | null>;
    public readonly statusStore: Readable<PeerStatus>;
    public readonly constraintsStore: Readable<ObtainedMediaStreamConstraints | null>;
    private newMessageSubscribtion: Subscription | undefined;
    private closing: Boolean = false; //this is used to prevent destroy() from being called twice
    private localStreamStoreSubscribe: Unsubscriber;
    private obtainedMediaConstraintStoreSubscribe: Unsubscriber;

    constructor(
        public user: UserSimplePeerInterface,
        initiator: boolean,
        public readonly userName: string,
        private connection: RoomConnection
    ) {
        super({
            initiator,
            config: {
                iceServers: getIceServersConfig(user),
            },
        });

        this.userId = user.userId;
        this.userUuid = playersStore.getPlayerById(this.userId)?.userUuid || "";
        this.uniqueId = "video_" + this.userId;

        this.streamStore = readable<MediaStream | null>(null, (set) => {
            const onStream = (stream: MediaStream | null) => {
                set(stream);
            };

            this.on("stream", onStream);

            return () => {
                this.off("stream", onStream);
            };
        });

        this.constraintsStore = readable<ObtainedMediaStreamConstraints | null>(null, (set) => {
            const onData = (chunk: Buffer) => {
                const message = JSON.parse(chunk.toString("utf8"));
                if (message.type === MESSAGE_TYPE_CONSTRAINT) {
                    set(message);
                }
            };

            this.on("data", onData);

            return () => {
                this.off("data", onData);
            };
        });

        this.statusStore = readable<PeerStatus>("connecting", (set) => {
            const onConnect = () => {
                set("connected");
            };
            const onError = () => {
                set("error");
            };
            const onClose = () => {
                set("closed");
            };

            this.on("connect", onConnect);
            this.on("error", onError);
            this.on("close", onClose);

            return () => {
                this.off("connect", onConnect);
                this.off("error", onError);
                this.off("close", onClose);
            };
        });

        //start listen signal for the peer connection
        this.on("signal", (data: unknown) => {
            this.sendWebrtcSignal(data);
        });

        this.on("stream", (stream: MediaStream) => this.stream(stream));

        this.on("close", () => {
            this._connected = false;
            this.toClose = true;
            this.destroy();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.on("error", (err: any) => {
            console.error(`error => ${this.userId} => ${err.code}`, err);
            mediaManager.isError("" + this.userId);
        });

        this.on("connect", () => {
            this._connected = true;
            chatMessagesStore.addIncomingUser(this.userId);

            this.newMessageSubscribtion = newChatMessageSubject.subscribe((newMessage) => {
                if (!newMessage) return;
                this.write(
                    new Buffer(
                        JSON.stringify({
                            type: MESSAGE_TYPE_MESSAGE,
                            message: newMessage,
                        })
                    )
                );
            });
        });

        this.on("data", (chunk: Buffer) => {
            const message = JSON.parse(chunk.toString("utf8"));
            if (message.type === MESSAGE_TYPE_CONSTRAINT) {
                if (message.audio) {
                    mediaManager.enabledMicrophoneByUserId(this.userId);
                } else {
                    mediaManager.disabledMicrophoneByUserId(this.userId);
                }

                if (message.video || message.screen) {
                    mediaManager.enabledVideoByUserId(this.userId);
                } else {
                    mediaManager.disabledVideoByUserId(this.userId);
                }
            } else if (message.type === MESSAGE_TYPE_MESSAGE) {
                if (!blackListManager.isBlackListed(this.userUuid)) {
                    chatMessagesStore.addExternalMessage(this.userId, message.message);
                }
            } else if (message.type === MESSAGE_TYPE_BLOCKED) {
                //FIXME when A blacklists B, the output stream from A is muted in B's js client. This is insecure since B can manipulate the code to unmute A stream.
                // Find a way to block A's output stream in A's js client
                //However, the output stream stream B is correctly blocked in A client
                this.blocked = true;
                this.toggleRemoteStream(false);
            } else if (message.type === MESSAGE_TYPE_UNBLOCKED) {
                this.blocked = false;
                this.toggleRemoteStream(true);
            }
        });

        this.once("finish", () => {
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
        this.obtainedMediaConstraintStoreSubscribe = obtainedMediaConstraintStore.subscribe((constraints) => {
            this.write(
                new Buffer(
                    JSON.stringify({
                        type: MESSAGE_TYPE_CONSTRAINT,
                        ...constraints,
                        isMobile: isMediaBreakpointUp("md"),
                    })
                )
            );
        });
    }

    private sendBlockMessage(blocking: boolean) {
        this.write(
            new Buffer(
                JSON.stringify({
                    type: blocking ? MESSAGE_TYPE_BLOCKED : MESSAGE_TYPE_UNBLOCKED,
                    name: this.userName.toUpperCase(),
                    userId: this.userId,
                    message: "",
                })
            )
        );
    }

    private toggleRemoteStream(enable: boolean) {
        this.remoteStream.getTracks().forEach((track) => (track.enabled = enable));
        mediaManager.toggleBlockLogo(this.userId, !enable);
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
            this.newMessageSubscribtion?.unsubscribe();
            chatMessagesStore.addOutcomingUser(this.userId);
            if (this.localStreamStoreSubscribe) this.localStreamStoreSubscribe();
            if (this.obtainedMediaConstraintStoreSubscribe) this.obtainedMediaConstraintStoreSubscribe();
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
}
