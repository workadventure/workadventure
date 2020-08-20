import {
    Connection,
    WebRtcDisconnectMessageInterface,
    WebRtcSignalReceivedMessageInterface,
    WebRtcStartMessageInterface
} from "../Connection";
import { mediaManager } from "./MediaManager";
import * as SimplePeerNamespace from "simple-peer";
import {ScreenSharingPeer} from "./ScreenSharingPeer";
import {VideoPeer} from "./VideoPeer";
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

    private PeerScreenSharingConnectionArray: Map<string, ScreenSharingPeer> = new Map<string, ScreenSharingPeer>();
    private PeerConnectionArray: Map<string, VideoPeer> = new Map<string, VideoPeer>();
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
        this.Connection.receiveWebrtcSignal((message: WebRtcSignalReceivedMessageInterface) => {
            this.receiveWebrtcSignal(message);
        });

        //receive signal by gemer
        this.Connection.receiveWebrtcScreenSharingSignal((message: WebRtcSignalReceivedMessageInterface) => {
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
    private createPeerConnection(user : UserSimplePeerInterface) : VideoPeer | null{
        if(
            this.PeerConnectionArray.has(user.userId)
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

        mediaManager.removeActiveVideo(user.userId);
        mediaManager.addActiveVideo(user.userId, name);

        let peer = new VideoPeer(user.userId, user.initiator ? user.initiator : false, this.Connection);
        // When a connection is established to a video stream, and if a screen sharing is taking place,
        // the user sharing screen should also initiate a connection to the remote user!
        peer.on('connect', () => {
            if (mediaManager.localScreenCapture) {
                this.sendLocalScreenSharingStreamToUser(user.userId);
            }
        });
        this.PeerConnectionArray.set(user.userId, peer);

        for (const peerConnectionListener of this.peerConnectionListeners) {
            peerConnectionListener.onConnect(user);
        }
        return peer;
    }

    /**
     * create peer connection to bind users
     */
    private createPeerScreenSharingConnection(user : UserSimplePeerInterface) : ScreenSharingPeer | null{
        if(
            this.PeerScreenSharingConnectionArray.has(user.userId)
        ){
            return null;
        }

        // We should display the screen sharing ONLY if we are not initiator
        if (!user.initiator) {
            mediaManager.removeActiveScreenSharingVideo(user.userId);
            mediaManager.addScreenSharingActiveVideo(user.userId);
        }

        let peer = new ScreenSharingPeer(user.userId, user.initiator ? user.initiator : false, this.Connection);
        this.PeerScreenSharingConnectionArray.set(user.userId, peer);

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
            //mediaManager.removeActiveVideo(userId);
            const peer = this.PeerConnectionArray.get(userId);
            if (peer === undefined) {
                console.warn("Tried to close connection for user "+userId+" but could not find user")
                return;
            }
            peer.closeConnection();
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            //console.log('Closing connection with '+userId);
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
            peer.closeScreenSharingConnection();
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

        for (const userId of this.PeerScreenSharingConnectionArray.keys()) {
            this.closeScreenSharingConnection(userId);
        }
    }

    /**
     * Unregisters any held event handler.
     */
    public unregister() {
        mediaManager.removeUpdateLocalStreamEventListener(this.sendLocalVideoStreamCallback);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private receiveWebrtcSignal(data: WebRtcSignalReceivedMessageInterface) {
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

    private receiveWebrtcScreenSharingSignal(data: WebRtcSignalReceivedMessageInterface) {
        console.log("receiveWebrtcScreenSharingSignal", data);
        try {
            //if offer type, create peer connection
            if(data.signal.type === "offer"){
                this.createPeerScreenSharingConnection(data);
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
        const PeerConnectionScreenSharing = this.createPeerScreenSharingConnection(screenSharingUser);
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
