import {
    Connection,
    WebRtcDisconnectMessageInterface,
    WebRtcSignalMessageInterface,
    WebRtcStartMessageInterface
} from "../Connection";
import { mediaManager } from "./MediaManager";
import * as SimplePeerNamespace from "simple-peer";
const Peer: SimplePeerNamespace.SimplePeer = require('simple-peer');

export interface UserSimplePeer{
    userId: string;
    name?: string;
    initiator?: boolean;
}

/**
 * This class manages connections to all the peers in the same group as me.
 */
export class SimplePeer {
    private Connection: Connection;
    private WebRtcRoomId: string;
    private Users: Array<UserSimplePeer> = new Array<UserSimplePeer>();

    private PeerConnectionArray: Map<string, SimplePeerNamespace.Instance> = new Map<string, SimplePeerNamespace.Instance>();
    private readonly updateLocalStreamCallback: (media: MediaStream) => void;

    constructor(Connection: Connection, WebRtcRoomId: string = "test-webrtc") {
        this.Connection = Connection;
        this.WebRtcRoomId = WebRtcRoomId;
        // We need to go through this weird bound function pointer in order to be able to "free" this reference later.
        this.updateLocalStreamCallback = this.updatedLocalStream.bind(this);
        mediaManager.onUpdateLocalStream(this.updateLocalStreamCallback);
        this.initialise();
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise() {

        //receive signal by gemer
        this.Connection.receiveWebrtcSignal((message: WebRtcSignalMessageInterface) => {
            this.receiveWebrtcSignal(message);
        });

        mediaManager.activeVisio();
        mediaManager.getCamera().then(() => {

            //receive message start
            this.Connection.receiveWebrtcStart((message: WebRtcStartMessageInterface) => {
                this.receiveWebrtcStart(message);
            });

        }).catch((err) => {
            console.error("err", err);
        });

        this.Connection.disconnectMessage((data: WebRtcDisconnectMessageInterface): void => {
            this.closeConnection(data.userId);
        });
    }

    private receiveWebrtcStart(data: WebRtcStartMessageInterface) {
        this.WebRtcRoomId = data.roomId;
        this.Users = data.clients;
        // Note: the clients array contain the list of all clients (event the ones we are already connected to in case a user joints a group)
        // So we can receive a request we already had before. (which will abort at the first line of createPeerConnection)
        // TODO: refactor this to only send a message to connect to one user (rather than several users).
        // This would be symmetrical to the way we handle disconnection.
        //console.log('Start message', data);

        //start connection
        this.startWebRtc();
    }

    /**
     * server has two people connected, start the meet
     */
    private startWebRtc() {
        this.Users.forEach((user: UserSimplePeer) => {
            //if it's not an initiator, peer connection will be created when gamer will receive offer signal
            if(!user.initiator){
                return;
            }
            this.createPeerConnection(user);
        });
    }

    /**
     * create peer connection to bind users
     */
    private createPeerConnection(user : UserSimplePeer) {
        if(this.PeerConnectionArray.has(user.userId)) {
            return;
        }

        //console.log("Creating connection with peer "+user.userId);

        let name = user.name;
        if(!name){
            const userSearch = this.Users.find((userSearch: UserSimplePeer) => userSearch.userId === user.userId);
            if(userSearch) {
                name = userSearch.name;
            }
        }
        mediaManager.removeActiveVideo(user.userId);
        mediaManager.addActiveVideo(user.userId, name);

        const peer : SimplePeerNamespace.Instance = new Peer({
            initiator: user.initiator ? user.initiator : false,
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
            },
        });
        this.PeerConnectionArray.set(user.userId, peer);

        //start listen signal for the peer connection
        peer.on('signal', (data: unknown) => {
            this.sendWebrtcSignal(data, user.userId);
        });

        peer.on('stream', (stream: MediaStream) => {
            let videoActive = false;
            let microphoneActive = false;
            stream.getTracks().forEach((track :  MediaStreamTrack) => {
                if(track.kind === "audio"){
                    microphoneActive = true;
                }
                if(track.kind === "video"){
                    videoActive = true;
                }
            });
            if(microphoneActive){
                mediaManager.enabledMicrophoneByUserId(user.userId);
            }else{
                mediaManager.disabledMicrophoneByUserId(user.userId);
            }

            if(videoActive){
                mediaManager.enabledVideoByUserId(user.userId);
            }else{
                mediaManager.disabledVideoByUserId(user.userId);
            }
            this.stream(user.userId, stream);
        });

        /*peer.on('track', (track: MediaStreamTrack, stream: MediaStream) => {
            this.stream(user.userId, stream);
        });*/

        peer.on('close', () => {
            this.closeConnection(user.userId);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        peer.on('error', (err: any) => {
            console.error(`error => ${user.userId} => ${err.code}`, err);
            mediaManager.isError(user.userId);
        });

        peer.on('connect', () => {
            mediaManager.isConnected(user.userId);
            console.info(`connect => ${user.userId}`);
        });

        peer.on('data',  (chunk: Buffer) => {
            const data = JSON.parse(chunk.toString('utf8'));
            if(data.type === "stream"){
                this.stream(user.userId, data.stream);
            }
        });

        this.addMedia(user.userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     *
     * @param userId
     */
    private closeConnection(userId : string) {
        try {
            mediaManager.removeActiveVideo(userId);
            const peer = this.PeerConnectionArray.get(userId);
            if (peer === undefined) {
                console.warn("Tried to close connection for user "+userId+" but could not find user")
                return;
            }
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            //console.log('Closing connection with '+userId);
            peer.destroy();
            this.PeerConnectionArray.delete(userId)
            //console.log('Nb users in peerConnectionArray '+this.PeerConnectionArray.size);
        } catch (err) {
            console.error("closeConnection", err)
        }
    }

    public closeAllConnections() {
        for (const userId of this.PeerConnectionArray.keys()) {
            this.closeConnection(userId);
        }
    }

    /**
     * Unregisters any held event handler.
     */
    public unregister() {
        mediaManager.removeUpdateLocalStreamEventListener(this.updateLocalStreamCallback);
    }

    /**
     *
     * @param userId
     * @param data
     */
    private sendWebrtcSignal(data: unknown, userId : string) {
        try {
            this.Connection.sendWebrtcSignal(data, this.WebRtcRoomId, null, userId);
        }catch (e) {
            console.error(`sendWebrtcSignal => ${userId}`, e);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private receiveWebrtcSignal(data: WebRtcSignalMessageInterface) {
        try {
            //if offer type, create peer connection
            if(data.signal.type === "offer"){
                this.createPeerConnection(data);
            }
            const peer = this.PeerConnectionArray.get(data.userId);
            if (peer !== undefined) {
                peer.signal(data.signal);
            } else {
                console.error('Could not find peer whose ID is "'+data.userId+'" in PeerConnectionArray');
            }
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${data.userId}`, e);
        }
    }

    /**
     *
     * @param userId
     * @param stream
     */
    private stream(userId : string, stream: MediaStream) {
        if(!stream){
            mediaManager.disabledVideoByUserId(userId);
            mediaManager.disabledMicrophoneByUserId(userId);
            return;
        }
        mediaManager.addStreamRemoteVideo(userId, stream);
    }

    /**
     *
     * @param userId
     */
    private addMedia (userId : string) {
        try {
            const localStream: MediaStream|null = mediaManager.localStream;
            const peer = this.PeerConnectionArray.get(userId);
            if(localStream === null) {
                //send fake signal
                if(peer === undefined){
                    return;
                }
                peer.write(new Buffer(JSON.stringify({
                    type: "stream",
                    stream: null
                })));
                return;
            }
            if (peer === undefined) {
                throw new Error('While adding media, cannot find user with ID '+userId);
            }
            for (const track of localStream.getTracks()) {
                peer.addTrack(track, localStream);
            }
        }catch (e) {
            console.error(`addMedia => addMedia => ${userId}`, e);
        }
    }

    updatedLocalStream(){
        this.Users.forEach((user: UserSimplePeer) => {
            this.addMedia(user.userId);
        })
    }
}
