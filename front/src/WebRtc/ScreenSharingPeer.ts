import type * as SimplePeerNamespace from "simple-peer";
import type { RoomConnection } from "../Connexion/RoomConnection";
import { MESSAGE_TYPE_CONSTRAINT, PeerStatus } from "./VideoPeer";
import type { UserSimplePeerInterface } from "./SimplePeer";
import { Readable, readable, writable, Writable } from "svelte/store";
import { getIceServersConfig } from "../Components/Video/utils";
import { highlightedEmbedScreen } from "../Stores/EmbedScreensStore";
import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";

const Peer: SimplePeerNamespace.SimplePeer = require("simple-peer");

/**
 * A peer connection used to transmit video / audio signals between 2 peers.
 */
export class ScreenSharingPeer extends Peer {
    /**
     * Whether this connection is currently receiving a video stream from a remote user.
     */
    private isReceivingStream: boolean = false;
    public toClose: boolean = false;
    public _connected: boolean = false;
    public readonly userId: number;
    public readonly uniqueId: string;
    public readonly streamStore: Readable<MediaStream | null>;
    public readonly statusStore: Writable<PeerStatus>;

    constructor(
        user: UserSimplePeerInterface,
        initiator: boolean,
        public readonly userName: string,
        private connection: RoomConnection,
        stream: MediaStream | null
    ) {
        super({
            initiator,
            config: {
                iceServers: getIceServersConfig(user),
            },
        });

        this.userId = user.userId;
        this.uniqueId = "screensharing_" + this.userId;

        this.streamStore = readable<MediaStream | null>(null, (set) => {
            const onStream = (stream: MediaStream | null) => {
                highlightedEmbedScreen.highlight({
                    type: "streamable",
                    embed: this,
                });
                set(stream);
            };
            const onData = (chunk: Buffer) => {
                // We unfortunately need to rely on an event to let the other party know a stream has stopped.
                // It seems there is no native way to detect that.
                // TODO: we might rely on the "ended" event: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended_event
                const message = JSON.parse(chunk.toString("utf8"));
                if (message.streamEnded !== true) {
                    console.error("Unexpected message on screen sharing peer connection");
                    return;
                }
                set(null);
            };

            this.on("stream", onStream);
            this.on("data", onData);

            return () => {
                this.off("stream", onStream);
                this.off("data", onData);
            };
        });

        this.statusStore = writable<PeerStatus>("connecting", (set) => {
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
            this.sendWebrtcScreenSharingSignal(data);
        });

        this.on("stream", (stream: MediaStream) => {
            this.stream(stream);
        });

        this.on("close", () => {
            this._connected = false;
            this.toClose = true;
            this.destroy();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.on("error", (err: any) => {
            console.error(`screen sharing error => ${this.userId} => ${err.code}`, err);
        });

        this.on("connect", () => {
            this._connected = true;
            console.info(`connect => ${this.userId}`);
        });

        this.once("finish", () => {
            this._onFinish();
        });

        if (stream) {
            this.addStream(stream);
        }
    }

    private sendWebrtcScreenSharingSignal(data: unknown) {
        try {
            this.connection.sendWebrtcScreenSharingSignal(data, this.userId);
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
                this.statusStore.set("connected");
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
            //console.log('Closing connection with '+userId);
            super.destroy(error);
            //console.log('Nb users in peerConnectionArray '+this.PeerConnectionArray.size);
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
                    type: MESSAGE_TYPE_CONSTRAINT,
                    streamEnded: true,
                    isMobile: isMediaBreakpointUp("md"),
                })
            )
        );
    }
}
