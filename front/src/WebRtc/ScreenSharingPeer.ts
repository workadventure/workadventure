import * as SimplePeerNamespace from "simple-peer";
import {mediaManager} from "./MediaManager";
import {Connection} from "../Connection";

const Peer: SimplePeerNamespace.SimplePeer = require('simple-peer');

/**
 * A peer connection used to transmit video / audio signals between 2 peers.
 */
export class ScreenSharingPeer extends Peer {
    constructor(private userId: string, initiator: boolean, private connection: Connection) {
        super({
            initiator: initiator ? initiator : false,
            reconnectTimer: 10000,
            config: {
                iceServers: [
                    {
                        urls: 'stun:stun.l.google.com:19302'
                    },
                    {
                        urls: 'turn:numb.viagenie.ca',
                        username: 'g.parant@thecodingmachine.com',
                        credential: 'itcugcOHxle9Acqi$'
                    },
                ]
            }
        });

        //start listen signal for the peer connection
        this.on('signal', (data: unknown) => {
            this.sendWebrtcScreenSharingSignal(data);
        });

        this.on('stream', (stream: MediaStream) => {
            this.stream(stream);
        });

        /*this.on('track', (track: MediaStreamTrack, stream: MediaStream) => {
        });*/

        this.on('close', () => {
            this.closeScreenSharingConnection();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.on('error', (err: any) => {
            console.error(`screen sharing error => ${this.userId} => ${err.code}`, err);
            //mediaManager.isErrorScreenSharing(this.userId);
        });

        this.on('connect', () => {
            // FIXME: we need to put the loader on the screen sharing connection
            mediaManager.isConnected(this.userId);
            console.info(`connect => ${this.userId}`);
        });

        this.pushScreenSharingToRemoteUser();
    }

    private sendWebrtcScreenSharingSignal(data: unknown) {
        console.log("sendWebrtcScreenSharingSignal", data);
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
        console.log(`ScreenSharingPeer::stream => ${this.userId}`, stream);
        console.log(`stream => ${this.userId} => `, stream);
        if(!stream){
            mediaManager.removeActiveScreenSharingVideo(this.userId);
        } else {
            mediaManager.addStreamRemoteScreenSharing(this.userId, stream);
        }
    }

    public closeScreenSharingConnection() {
        try {
            mediaManager.removeActiveScreenSharingVideo(this.userId);
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            //console.log('Closing connection with '+userId);
            this.destroy();
            //console.log('Nb users in peerConnectionArray '+this.PeerConnectionArray.size);
        } catch (err) {
            console.error("closeConnection", err)
        }
    }

    private pushScreenSharingToRemoteUser() {
        const localScreenCapture: MediaStream | null = mediaManager.localScreenCapture;
        if(!localScreenCapture){
            return;
        }

        for (const track of localScreenCapture.getTracks()) {
            this.addTrack(track, localScreenCapture);
        }
        return;
    }
}
