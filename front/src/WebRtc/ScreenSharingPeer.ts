import * as SimplePeerNamespace from "simple-peer";
import {mediaManager} from "./MediaManager";
import {STUN_SERVER, TURN_SERVER, TURN_USER, TURN_PASSWORD} from "../Enum/EnvironmentVariable";
import {RoomConnection} from "../Connexion/RoomConnection";
import {MESSAGE_TYPE_CONSTRAINT} from "./VideoPeer";
import {UserSimplePeerInterface} from "./SimplePeer";

const Peer: SimplePeerNamespace.SimplePeer = require('simple-peer');

/**
 * A peer connection used to transmit video / audio signals between 2 peers.
 */
export class ScreenSharingPeer extends Peer {
    /**
     * Whether this connection is currently receiving a video stream from a remote user.
     */
    private isReceivingStream:boolean = false;
    public toClose: boolean = false;
    public _connected: boolean = false;
    private userId: number;

    constructor(user: UserSimplePeerInterface, initiator: boolean, private connection: RoomConnection) {
        super({
            initiator: initiator ? initiator : false,
            reconnectTimer: 10000,
            config: {
                iceServers: [
                    {
                        urls: STUN_SERVER.split(',')
                    },
                    TURN_SERVER !== '' ? {
                        urls: TURN_SERVER.split(','),
                        username: user.webRtcUser || TURN_USER,
                        credential: user.webRtcPassword || TURN_PASSWORD
                    } :  undefined,
                ].filter((value) => value !== undefined)
            }
        });

        this.userId = user.userId;

        //start listen signal for the peer connection
        this.on('signal', (data: unknown) => {
            this.sendWebrtcScreenSharingSignal(data);
        });

        this.on('stream', (stream: MediaStream) => {
            this.stream(stream);
        });

        this.on('close', () => {
            this._connected = false;
            this.toClose = true;
            this.destroy();
        });

        this.on('data',  (chunk: Buffer) => {
            // We unfortunately need to rely on an event to let the other party know a stream has stopped.
            // It seems there is no native way to detect that.
            const message = JSON.parse(chunk.toString('utf8'));
            if (message.streamEnded !== true) {
                console.error('Unexpected message on screen sharing peer connection');
            }
            mediaManager.removeActiveScreenSharingVideo("" + this.userId);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.on('error', (err: any) => {
            console.error(`screen sharing error => ${this.userId} => ${err.code}`, err);
            //mediaManager.isErrorScreenSharing(this.userId);
        });

        this.on('connect', () => {
            this._connected = true;
            // FIXME: we need to put the loader on the screen sharing connection
            mediaManager.isConnected("" + this.userId);
            console.info(`connect => ${this.userId}`);
        });

        this.once('finish', () => {
            this._onFinish();
        });

        this.pushScreenSharingToRemoteUser();
    }

    private sendWebrtcScreenSharingSignal(data: unknown) {
        //console.log("sendWebrtcScreenSharingSignal", data);
        try {
            this.connection.sendWebrtcScreenSharingSignal(data, this.userId);
        }catch (e) {
            console.error(`sendWebrtcScreenSharingSignal => ${this.userId}`, e);
        }
    }

    /**
     * Sends received stream to screen.
     */
    private stream(stream?: MediaStream) {
        //console.log(`ScreenSharingPeer::stream => ${this.userId}`, stream);
        //console.log(`stream => ${this.userId} => `, stream);
        if(!stream){
            mediaManager.removeActiveScreenSharingVideo("" + this.userId);
            this.isReceivingStream = false;
        } else {
            mediaManager.addStreamRemoteScreenSharing("" + this.userId, stream);
            this.isReceivingStream = true;
        }
    }

    public isReceivingScreenSharingStream(): boolean {
        return this.isReceivingStream;
    }

    public destroy(error?: Error): void {
        try {
            this._connected = false
            if(!this.toClose){
                return;
            }
            mediaManager.removeActiveScreenSharingVideo("" + this.userId);
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            //console.log('Closing connection with '+userId);
            super.destroy(error);
            //console.log('Nb users in peerConnectionArray '+this.PeerConnectionArray.size);
        } catch (err) {
            console.error("ScreenSharingPeer::destroy", err)
        }
    }

    _onFinish () {
        if (this.destroyed) return
        const destroySoon = () => {
            this.destroy();
        }
        if (this._connected) {
            destroySoon();
        } else {
            this.once('connect', destroySoon);
        }
    }

    private pushScreenSharingToRemoteUser() {
        const localScreenCapture: MediaStream | null = mediaManager.localScreenCapture;
        if(!localScreenCapture){
            return;
        }

        this.addStream(localScreenCapture);
        return;
    }

    public stopPushingScreenSharingToRemoteUser(stream: MediaStream) {
        this.removeStream(stream);
        this.write(new Buffer(JSON.stringify({type: MESSAGE_TYPE_CONSTRAINT, streamEnded: true})));
    }
}
