import * as SimplePeerNamespace from "simple-peer";
import {mediaManager} from "./MediaManager";
import {TURN_PASSWORD, TURN_SERVER, TURN_USER} from "../Enum/EnvironmentVariable";
import {RoomConnection} from "../Connexion/RoomConnection";

const Peer: SimplePeerNamespace.SimplePeer = require('simple-peer');

/**
 * A peer connection used to transmit video / audio signals between 2 peers.
 */
export class VideoPeer extends Peer {
    public toClose: boolean = false;
    public _connected: boolean = false;

    constructor(public userId: number, initiator: boolean, private connection: RoomConnection) {
        super({
            initiator: initiator ? initiator : false,
            reconnectTimer: 10000,
            config: {
                iceServers: [
                    {
                        urls: 'stun:stun.l.google.com:19302'
                    },
                    {
                        urls: TURN_SERVER.split(','),
                        username: TURN_USER,
                        credential: TURN_PASSWORD
                    },
                ]
            }
        });

        console.log('PEER SETUP ', {
            initiator: initiator ? initiator : false,
            reconnectTimer: 10000,
            config: {
                iceServers: [
                    {
                        urls: 'stun:stun.l.google.com:19302'
                    },
                    {
                        urls: TURN_SERVER,
                        username: TURN_USER,
                        credential: TURN_PASSWORD
                    },
                ]
            }
        })

        //start listen signal for the peer connection
        this.on('signal', (data: unknown) => {
            this.sendWebrtcSignal(data);
        });

        this.on('stream', (stream: MediaStream) => {
            this.stream(stream);
        });

        /*peer.on('track', (track: MediaStreamTrack, stream: MediaStream) => {
        });*/

        this.on('close', () => {
            this._connected = false;
            this.toClose = true;
            this.destroy();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.on('error', (err: any) => {
            console.error(`error => ${this.userId} => ${err.code}`, err);
            mediaManager.isError("" + userId);
        });

        this.on('connect', () => {
            this._connected = true;
            mediaManager.isConnected("" + this.userId);
            console.info(`connect => ${this.userId}`);
        });

        this.on('data',  (chunk: Buffer) => {
            const constraint = JSON.parse(chunk.toString('utf8'));
            console.log("data", constraint);
            if (constraint.audio) {
                mediaManager.enabledMicrophoneByUserId(this.userId);
            } else {
                mediaManager.disabledMicrophoneByUserId(this.userId);
            }

            if (constraint.video || constraint.screen) {
                mediaManager.enabledVideoByUserId(this.userId);
            } else {
                this.stream(undefined);
                mediaManager.disabledVideoByUserId(this.userId);
            }
        });

        this.once('finish', () => {
            this._onFinish();
        });

        this.pushVideoToRemoteUser();
    }

    private sendWebrtcSignal(data: unknown) {
        try {
            this.connection.sendWebrtcSignal(data, this.userId);
        }catch (e) {
            console.error(`sendWebrtcSignal => ${this.userId}`, e);
        }
    }

    /**
     * Sends received stream to screen.
     */
    private stream(stream?: MediaStream) {
        //console.log(`VideoPeer::stream => ${this.userId}`, stream);
        if(!stream){
            mediaManager.disabledVideoByUserId(this.userId);
            mediaManager.disabledMicrophoneByUserId(this.userId);
        } else {
            try {
                mediaManager.addStreamRemoteVideo("" + this.userId, stream);
            }catch (err){
                console.error(err);
                //Force add streem video
                setTimeout(() => {
                    this.stream(stream);
                }, 500);
            }
        }
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    public destroy(error?: Error): void {
        try {
            this._connected = false
            if(!this.toClose){
                return;
            }
            mediaManager.removeActiveVideo("" + this.userId);
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            super.destroy(error);
        } catch (err) {
            console.error("VideoPeer::destroy", err)
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

    private pushVideoToRemoteUser() {
        try {
            const localStream: MediaStream | null = mediaManager.localStream;
            this.write(new Buffer(JSON.stringify(mediaManager.constraintsMedia)));

            if(!localStream){
                return;
            }

            for (const track of localStream.getTracks()) {
                this.addTrack(track, localStream);
            }
        }catch (e) {
            console.error(`pushVideoToRemoteUser => ${this.userId}`, e);
        }
    }
}
