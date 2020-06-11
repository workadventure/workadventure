import {ConnectionInterface, WebRtcDisconnectMessageInterface, WebRtcStartMessageInterface} from "../Connection";
import {MediaManager} from "./MediaManager";
import * as SimplePeerNamespace from "simple-peer";
let Peer: SimplePeerNamespace.SimplePeer = require('simple-peer');

export interface UserSimplePeerInterface{
    userId: string;
    name?: string;
    initiator?: boolean;
}

/**
 * This class manages connections to all the peers in the same group as me.
 */
export class SimplePeer {
    private Connection: ConnectionInterface;
    private WebRtcRoomId: string;
    private Users: Array<UserSimplePeerInterface> = new Array<UserSimplePeerInterface>();

    private MediaManager: MediaManager;

    private PeerScreenSharingConnectionArray: Map<string, SimplePeerNamespace.Instance> = new Map<string, SimplePeerNamespace.Instance>();
    private PeerConnectionArray: Map<string, SimplePeerNamespace.Instance> = new Map<string, SimplePeerNamespace.Instance>();

    constructor(Connection: ConnectionInterface, WebRtcRoomId: string = "test-webrtc") {
        this.Connection = Connection;
        this.WebRtcRoomId = WebRtcRoomId;
        this.MediaManager = new MediaManager(
            (stream: MediaStream) => {
                this.updatedLocalStream();
            },
            () => {
                this.updatedScreenSharing();
            }
        );
        this.initialise();
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise() {

        //receive signal by gemer
        this.Connection.receiveWebrtcSignal((message: any) => {
            this.receiveWebrtcSignal(message);
        });

        //receive signal by gemer
        this.Connection.receiveWebrtcScreenSharingSignal((message: any) => {
            this.receiveWebrtcScreenSharingSignal(message);
        });

        this.MediaManager.activeVisio();
        this.MediaManager.getCamera().then(() => {

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
        console.log("createPeerConnection => screenSharing", screenSharing)
        if(this.PeerConnectionArray.has(user.userId)) {
            return null;
        }

        let name = user.name;
        if(!name){
            let userSearch = this.Users.find((userSearch: UserSimplePeerInterface) => userSearch.userId === user.userId);
            if(userSearch) {
                name = userSearch.name;
            }
        }

        this.MediaManager.removeActiveVideo(user.userId);
        if(screenSharing) {
            this.MediaManager.addScreenSharingActiveVideo(user.userId);
        }else{
            this.MediaManager.addActiveVideo(user.userId, name);
        }

        let peer : SimplePeerNamespace.Instance = new Peer({
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
        if(screenSharing){
            this.PeerScreenSharingConnectionArray.set(user.userId, peer);
        }else {
            this.PeerConnectionArray.set(user.userId, peer);
        }

        //start listen signal for the peer connection
        peer.on('signal', (data: any) => {
            console.log("screenSharing", screenSharing);
            if(screenSharing){
                this.sendWebrtcScreenSharingSignal(data, user.userId);
                return;
            }
            this.sendWebrtcSignal(data, user.userId);
        });

        peer.on('stream', (stream: MediaStream) => {
            this.stream(user.userId, stream);
        });

        /*peer.on('track', (track: MediaStreamTrack, stream: MediaStream) => {
        });*/

        peer.on('close', () => {
            if(screenSharing){
                this.closeScreenSharingConnection(user.userId);
            }
            this.closeConnection(user.userId);
        });

        peer.on('error', (err: any) => {
            console.error(`error => ${user.userId} => ${err.code}`, err);
            this.MediaManager.isError(user.userId);
        });

        peer.on('connect', () => {
            this.MediaManager.isConnected(user.userId);
            console.info(`connect => ${user.userId}`);
        });

        peer.on('data',  (chunk: Buffer) => {
            let constraint = JSON.parse(chunk.toString('utf8'));
            if (constraint.audio) {
                this.MediaManager.enabledMicrophoneByUserId(user.userId);
            } else {
                this.MediaManager.disabledMicrophoneByUserId(user.userId);
            }

            if (constraint.video || constraint.screen) {
                this.MediaManager.enabledVideoByUserId(user.userId);
            } else {
                this.stream(user.userId);
                this.MediaManager.disabledVideoByUserId(user.userId);
            }
        });

        if(screenSharing){
            this.addMediaScreenSharing(user.userId);
        }else {
            this.addMedia(user.userId);
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
            this.MediaManager.removeActiveVideo(userId);
            let peer = this.PeerConnectionArray.get(userId);
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

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     *
     * @param userId
     */
    private closeScreenSharingConnection(userId : string) {
        try {
            this.MediaManager.removeActiveScreenSharingVideo(userId);
            let peer = this.PeerScreenSharingConnectionArray.get(userId);
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

    /**
     *
     * @param userId
     * @param data
     */
    private sendWebrtcSignal(data: any, userId : string) {
        console.log("sendWebrtcSignal", data);
        try {
            this.Connection.sendWebrtcSignal(data, this.WebRtcRoomId, null, userId);
        }catch (e) {
            console.error(`sendWebrtcSignal => ${userId}`, e);
        }
    }

    /**
     *
     * @param userId
     * @param data
     */
    private sendWebrtcScreenSharingSignal(data: any, userId : string) {
        console.log("sendWebrtcScreenSharingSignal", data);
        try {
            this.Connection.sendWebrtcScreenSharingSignal(data, this.WebRtcRoomId, null, userId);
        }catch (e) {
            console.error(`sendWebrtcSignal => ${userId}`, e);
        }
    }

    private receiveWebrtcSignal(data: any) {
        console.log("receiveWebrtcSignal", data);
        try {
            //if offer type, create peer connection
            if(data.signal.type === "offer"){
                this.createPeerConnection(data);
            }
            let peer = this.PeerConnectionArray.get(data.userId);
            if (peer !== undefined) {
                peer.signal(data.signal);
            } else {
                console.error('Could not find peer whose ID is "'+data.userId+'" in PeerConnectionArray');
            }
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${data.userId}`, e);
        }
    }

    private receiveWebrtcScreenSharingSignal(data: any) {
        console.log("receiveWebrtcScreenSharingSignal", data);
        try {
            //if offer type, create peer connection
            if(data.signal.type === "offer"){
                this.createPeerConnection(data, true);
            }
            let peer = this.PeerConnectionArray.get(data.userId);
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
    private stream(userId : string, stream?: MediaStream) {
        if(!stream){
            this.MediaManager.disabledVideoByUserId(userId);
            this.MediaManager.disabledMicrophoneByUserId(userId);
            return;
        }
        this.MediaManager.addStreamRemoteVideo(userId, stream);
    }

    /**
     *
     * @param userId
     */
    private addMedia (userId : any = null) {
        try {
            let PeerConnection = this.PeerConnectionArray.get(userId);
            if (!PeerConnection) {
                throw new Error('While adding media, cannot find user with ID ' + userId);
            }
            let localStream: MediaStream | null = this.MediaManager.localStream;
            PeerConnection.write(new Buffer(JSON.stringify(this.MediaManager.constraintsMedia)));

            if(!localStream){
                return;
            }
            if (localStream) {
                for (const track of localStream.getTracks()) {
                    PeerConnection.addTrack(track, localStream);
                }
            }
        }catch (e) {
            console.error(`addMedia => addMedia => ${userId}`, e);
        }
    }

    private addMediaScreenSharing (userId : any = null) {
        let PeerConnection = this.PeerScreenSharingConnectionArray.get(userId);
        if (!PeerConnection) {
            throw new Error('While adding media, cannot find user with ID ' + userId);
        }
        let localScreenCapture: MediaStream | null = this.MediaManager.localScreenCapture;
        if(!localScreenCapture){
            return;
        }
        /*for (const track of localScreenCapture.getTracks()) {
            PeerConnection.addTrack(track, localScreenCapture);
        }*/
        return;
    }

    updatedLocalStream(){
        this.Users.forEach((user: UserSimplePeerInterface) => {
            this.addMedia(user.userId);
        })
    }

    updatedScreenSharing() {
        if (this.MediaManager.localScreenCapture) {
            if(!this.Connection.userId){
                return;
            }
            let screenSharingUser: UserSimplePeerInterface = {
                userId: this.Connection.userId,
                initiator: true
            };
            let PeerConnectionScreenSharing = this.createPeerConnection(screenSharingUser, true);
            if (!PeerConnectionScreenSharing) {
                return;
            }
            try {
                for (const track of this.MediaManager.localScreenCapture.getTracks()) {
                    PeerConnectionScreenSharing.addTrack(track, this.MediaManager.localScreenCapture);
                }
            }catch (e) {
                console.error("updatedScreenSharing => ", e);
            }
            this.MediaManager.addStreamRemoteScreenSharing(screenSharingUser.userId, this.MediaManager.localScreenCapture);
        } else {
            if (!this.Connection.userId || !this.PeerScreenSharingConnectionArray.has(this.Connection.userId)) {
                return;
            }
            let PeerConnectionScreenSharing = this.PeerScreenSharingConnectionArray.get(this.Connection.userId);
            if (!PeerConnectionScreenSharing) {
                return;
            }
            PeerConnectionScreenSharing.destroy();
        }
    }
}
