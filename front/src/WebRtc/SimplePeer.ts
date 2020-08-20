import {
    Connection,
    WebRtcDisconnectMessageInterface,
    WebRtcSignalMessageInterface,
    WebRtcStartMessageInterface
} from "../Connection";
import { mediaManager } from "./MediaManager";
import * as SimplePeerNamespace from "simple-peer";
const Peer: SimplePeerNamespace.SimplePeer = require('simple-peer');

export interface UserSimplePeerInterface{
    userId: string;
    name?: string;
    initiator?: boolean;
}

export interface PeerConnectionListener {
    onConnect(user: UserSimplePeerInterface): void;

    onDisconnect(userId: string): void;
}

/**
 * This class manages connections to all the peers in the same group as me.
 */
export class SimplePeer {
    private Connection: Connection;
    private WebRtcRoomId: string;
    private Users: Array<UserSimplePeerInterface> = new Array<UserSimplePeerInterface>();

    private PeerScreenSharingConnectionArray: Map<string, SimplePeerNamespace.Instance> = new Map<string, SimplePeerNamespace.Instance>();
    private PeerConnectionArray: Map<string, SimplePeerNamespace.Instance> = new Map<string, SimplePeerNamespace.Instance>();
    private readonly sendLocalVideoStreamCallback: (media: MediaStream) => void;
    private readonly sendLocalScreenSharingStreamCallback: (media: MediaStream) => void;
    private readonly peerConnectionListeners: Array<PeerConnectionListener> = new Array<PeerConnectionListener>();

    constructor(Connection: Connection, WebRtcRoomId: string = "test-webrtc") {
        this.Connection = Connection;
        this.WebRtcRoomId = WebRtcRoomId;
        // We need to go through this weird bound function pointer in order to be able to "free" this reference later.
        this.sendLocalVideoStreamCallback = this.sendLocalVideoStream.bind(this);
        this.sendLocalScreenSharingStreamCallback = this.sendLocalScreenSharingStream.bind(this);
        mediaManager.onUpdateLocalStream(this.sendLocalVideoStreamCallback);
        mediaManager.onUpdateScreenSharing(this.sendLocalScreenSharingStreamCallback);
        this.initialise();
    }

    public registerPeerConnectionListener(peerConnectionListener: PeerConnectionListener) {
        this.peerConnectionListeners.push(peerConnectionListener);
    }

    public getNbConnections(): number {
        return this.PeerConnectionArray.size;
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise() {

        //receive signal by gemer
        this.Connection.receiveWebrtcSignal((message: WebRtcSignalMessageInterface) => {
            this.receiveWebrtcSignal(message);
        });

        //receive signal by gemer
        this.Connection.receiveWebrtcScreenSharingSignal((message: WebRtcSignalMessageInterface) => {
            this.receiveWebrtcScreenSharingSignal(message);
        });

        mediaManager.showGameOverlay();
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
        // Note: the clients array contain the list of all clients (even the ones we are already connected to in case a user joints a group)
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
        console.warn('startWebRtc startWebRtc');
        this.Users.forEach((user: UserSimplePeerInterface) => {
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
    private createPeerConnection(user : UserSimplePeerInterface, screenSharing: boolean = false) : SimplePeerNamespace.Instance | null{
        if(
            (screenSharing && this.PeerScreenSharingConnectionArray.has(user.userId))
            || (!screenSharing && this.PeerConnectionArray.has(user.userId))
        ){
            return null;
        }

        let name = user.name;
        if(!name){
            const userSearch = this.Users.find((userSearch: UserSimplePeerInterface) => userSearch.userId === user.userId);
            if(userSearch) {
                name = userSearch.name;
            }
        }

        if(screenSharing) {
            // We should display the screen sharing ONLY if we are not initiator
            if (!user.initiator) {
                mediaManager.removeActiveScreenSharingVideo(user.userId);
                mediaManager.addScreenSharingActiveVideo(user.userId);
            }
        }else{
            mediaManager.removeActiveVideo(user.userId);
            mediaManager.addActiveVideo(user.userId, name);
        }

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
            }
        });
        if(screenSharing){
            this.PeerScreenSharingConnectionArray.set(user.userId, peer);
        } else {
            this.PeerConnectionArray.set(user.userId, peer);
        }

        //start listen signal for the peer connection
        peer.on('signal', (data: unknown) => {
            if(screenSharing){
                //console.log('Sending WebRTC offer for screen sharing ', data, ' to ', user.userId);
                this.sendWebrtcScreenSharingSignal(data, user.userId);
            } else {
                this.sendWebrtcSignal(data, user.userId);
            }
        });

        peer.on('stream', (stream: MediaStream) => {
            this.stream(user.userId, stream, screenSharing);
        });

        /*peer.on('track', (track: MediaStreamTrack, stream: MediaStream) => {
        });*/

        peer.on('close', () => {
            if(screenSharing){
                this.closeScreenSharingConnection(user.userId);
                return;
            }
            this.closeConnection(user.userId);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        peer.on('error', (err: any) => {
            console.error(`error => ${user.userId} => ${err.code}`, err);
            if(screenSharing){
                //mediaManager.isErrorScreenSharing(user.userId);
                return;
            }
            mediaManager.isError(user.userId);
        });

        peer.on('connect', () => {
            mediaManager.isConnected(user.userId);
            console.info(`connect => ${user.userId}`);

            // When a connection is established to a video stream, and if a screen sharing is taking place,
            // the user sharing screen should also initiate a connection to the remote user!
            if (screenSharing === false && mediaManager.localScreenCapture) {
                this.sendLocalScreenSharingStreamToUser(user.userId);
            }
        });

        peer.on('data',  (chunk: Buffer) => {
            const constraint = JSON.parse(chunk.toString('utf8'));
            console.log("data", constraint);
            if (constraint.audio) {
                mediaManager.enabledMicrophoneByUserId(user.userId);
            } else {
                mediaManager.disabledMicrophoneByUserId(user.userId);
            }

            if (constraint.video || constraint.screen) {
                mediaManager.enabledVideoByUserId(user.userId);
            } else {
                this.stream(user.userId);
                mediaManager.disabledVideoByUserId(user.userId);
            }
        });

        if(screenSharing){
            this.pushScreenSharingToRemoteUser(user.userId);
        }else {
            this.pushVideoToRemoteUser(user.userId);
        }

        for (const peerConnectionListener of this.peerConnectionListeners) {
            peerConnectionListener.onConnect(user);
        }
        return peer;
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
            this.PeerConnectionArray.delete(userId);
            this.closeScreenSharingConnection(userId);
            //console.log('Nb users in peerConnectionArray '+this.PeerConnectionArray.size);
            for (const peerConnectionListener of this.peerConnectionListeners) {
                peerConnectionListener.onDisconnect(userId);
            }
        } catch (err) {
            console.error("closeConnection", err)
        }
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     *
     * @param userId
     */
    private closeScreenSharingConnection(userId : string) {
        try {
            mediaManager.removeActiveScreenSharingVideo(userId);
            const peer = this.PeerScreenSharingConnectionArray.get(userId);
            if (peer === undefined) {
                console.warn("Tried to close connection for user "+userId+" but could not find user")
                return;
            }
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            //console.log('Closing connection with '+userId);
            peer.destroy();
            this.PeerScreenSharingConnectionArray.delete(userId)
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
        mediaManager.removeUpdateLocalStreamEventListener(this.sendLocalVideoStreamCallback);
    }

    /**
     *
     * @param userId
     * @param data
     */
    private sendWebrtcSignal(data: unknown, userId : string) {
        try {
            this.Connection.sendWebrtcSignal(data, null, userId);
        }catch (e) {
            console.error(`sendWebrtcSignal => ${userId}`, e);
        }
    }

    /**
     *
     * @param userId
     * @param data
     */
    private sendWebrtcScreenSharingSignal(data: unknown, userId : string) {
        console.log("sendWebrtcScreenSharingSignal", data);
        try {
            this.Connection.sendWebrtcScreenSharingSignal(data, null, userId);
        }catch (e) {
            console.error(`sendWebrtcScreenSharingSignal => ${userId}`, e);
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

    private receiveWebrtcScreenSharingSignal(data: WebRtcSignalMessageInterface) {
        console.log("receiveWebrtcScreenSharingSignal", data);
        try {
            //if offer type, create peer connection
            if(data.signal.type === "offer"){
                this.createPeerConnection(data, true);
            }
            const peer = this.PeerScreenSharingConnectionArray.get(data.userId);
            if (peer !== undefined) {
                peer.signal(data.signal);
            } else {
                console.error('Could not find peer whose ID is "'+data.userId+'" in receiveWebrtcScreenSharingSignal');
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
    private stream(userId : string, stream?: MediaStream, screenSharing?: boolean) {
        console.log(`stream => ${userId} => screenSharing => ${screenSharing}`, stream);
        if(screenSharing){
            if(!stream){
                mediaManager.removeActiveScreenSharingVideo(userId);
                return;
            }
            mediaManager.addStreamRemoteScreenSharing(userId, stream);
            return;
        }
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
    private pushVideoToRemoteUser(userId : string) {
        try {
            const PeerConnection = this.PeerConnectionArray.get(userId);
            if (!PeerConnection) {
                throw new Error('While adding media, cannot find user with ID ' + userId);
            }
            const localStream: MediaStream | null = mediaManager.localStream;
            PeerConnection.write(new Buffer(JSON.stringify(mediaManager.constraintsMedia)));

            if(!localStream){
                return;
            }

            for (const track of localStream.getTracks()) {
                PeerConnection.addTrack(track, localStream);
            }
        }catch (e) {
            console.error(`pushVideoToRemoteUser => ${userId}`, e);
        }
    }

    private pushScreenSharingToRemoteUser(userId : string) {
        const PeerConnection = this.PeerScreenSharingConnectionArray.get(userId);
        if (!PeerConnection) {
            throw new Error('While pushing screen sharing, cannot find user with ID ' + userId);
        }
        const localScreenCapture: MediaStream | null = mediaManager.localScreenCapture;
        if(!localScreenCapture){
            return;
        }

        for (const track of localScreenCapture.getTracks()) {
            PeerConnection.addTrack(track, localScreenCapture);
        }
        return;
    }

    public sendLocalVideoStream(){
        this.Users.forEach((user: UserSimplePeerInterface) => {
            this.pushVideoToRemoteUser(user.userId);
        })
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public sendLocalScreenSharingStream() {
        if (mediaManager.localScreenCapture) {
            for (const user of this.Users) {
                this.sendLocalScreenSharingStreamToUser(user.userId);
            }
        } else {
            for (const user of this.Users) {
                this.stopLocalScreenSharingStreamToUser(user.userId);
            }
        }
    }

    private sendLocalScreenSharingStreamToUser(userId: string): void {
        // If a connection already exists with user (because it is already sharing a screen with us... let's use this connection)
        if (this.PeerScreenSharingConnectionArray.has(userId)) {
            this.pushScreenSharingToRemoteUser(userId);
            return;
        }

        const screenSharingUser: UserSimplePeerInterface = {
            userId,
            initiator: true
        };
        const PeerConnectionScreenSharing = this.createPeerConnection(screenSharingUser, true);
        if (!PeerConnectionScreenSharing) {
            return;
        }
    }

    private stopLocalScreenSharingStreamToUser(userId: string): void {
        const PeerConnectionScreenSharing = this.PeerScreenSharingConnectionArray.get(userId);
        if (!PeerConnectionScreenSharing) {
            throw new Error('Weird, screen sharing connection to user ' + userId + 'not found')
        }

        console.log("updatedScreenSharing => destroy", PeerConnectionScreenSharing);
        // FIXME: maybe we don't want to destroy the connexion if it is used in the other way around!
        // FIXME: maybe we don't want to destroy the connexion if it is used in the other way around!
        // FIXME: maybe we don't want to destroy the connexion if it is used in the other way around!
        PeerConnectionScreenSharing.destroy();
        this.PeerScreenSharingConnectionArray.delete(userId);
    }
}
