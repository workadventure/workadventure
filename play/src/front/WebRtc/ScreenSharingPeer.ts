import { Buffer } from "buffer";
import { get, Readable, Writable, writable } from "svelte/store";
import Peer from "simple-peer/simplepeer.min.js";
import type { RoomConnection } from "../Connection/RoomConnection";
import { getIceServersConfig, getSdpTransform } from "../Components/Video/utils";
import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
import { screenShareBandwidthStore } from "../Stores/ScreenSharingStore";
import type { PeerStatus } from "./VideoPeer";
import type { UserSimplePeerInterface } from "./SimplePeer";
import { StreamEndedMessage } from "./P2PMessages/StreamEndedMessage";

/**
 * A peer connection used to transmit video / audio signals between 2 peers.
 */
export class ScreenSharingPeer extends Peer {
    /**
     * Whether this connection is currently receiving a video stream from a remote user.
     */
    private isReceivingStream = false;
    public toClose = false;
    public _connected = false;
    public readonly userId: number;
    public readonly uniqueId: string;
    private readonly _streamStore: Writable<MediaStream | null>;
    private readonly _statusStore: Writable<PeerStatus>;

    constructor(
        user: UserSimplePeerInterface,
        initiator: boolean,
        public readonly userName: string,
        private connection: RoomConnection,
        stream: MediaStream | null
    ) {
        const bandwidth = get(screenShareBandwidthStore);
        super({
            initiator,
            config: {
                iceServers: getIceServersConfig(user),
            },
            sdpTransform: getSdpTransform(bandwidth === "unlimited" ? undefined : bandwidth),
        });

        this.userId = user.userId;
        this.uniqueId = "screensharing_" + this.userId;

        this._streamStore = writable<MediaStream | null>(null);

        this.on("stream", (stream: MediaStream | null) => {
            highlightedEmbedScreen.highlight({
                type: "streamable",
                embed: this,
            });
            this._streamStore.set(stream);
        });

        this.on("data", (chunk: Buffer) => {
            try {
                const data = JSON.parse(chunk.toString("utf8"));

                // The only message type we can send is a StreamEndedMessage
                StreamEndedMessage.parse(data);
                this._streamStore.set(null);
                /*const message = P2PScreenSharingMessage.parse(data);
                switch (message.type) {
                    // We unfortunately need to rely on an event to let the other party know a stream has stopped.
                    // It seems there is no native way to detect that.
                    // TODO: we might rely on the "ended" event: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended_event
                    case "stream_ended": {
                        this._streamStore.set(null);
                        break;
                    }
                    default: {
                        const _exhaustiveCheck: never = message;
                    }
                }*/
            } catch (e) {
                console.error("Unexpected P2P screen sharing message received from peer: ", e);
                this._statusStore.set("error");
            }
        });

        this._statusStore = writable<PeerStatus>("connecting");

        //start listen signal for the peer connection
        this.on("signal", (data: unknown) => {
            this.sendWebrtcScreenSharingSignal(data);
        });

        this.on("stream", (stream: MediaStream) => {
            this.stream(stream);
        });

        this.on("close", () => {
            this._statusStore.set("closed");
            this._connected = false;
            this.toClose = true;
            this.destroy();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.on("error", (err: any) => {
            console.error(`screen sharing error => ${this.userId} => ${err.code}`, err);
            this._statusStore.set("error");
        });

        this.on("connect", () => {
            this._connected = true;
            console.info(`connect => ${this.userId}`);
            this._statusStore.set("connected");
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
                    type: "stream_ended",
                } as StreamEndedMessage)
            )
        );
    }

    public get statusStore(): Readable<PeerStatus> {
        return this._statusStore;
    }

    get streamStore(): Readable<MediaStream | null> {
        return this._streamStore;
    }
}
