import {
    WebRtcDisconnectMessageInterface,
    WebRtcSignalReceivedMessageInterface,
} from "../Connexion/ConnexionModels";
import {
    mediaManager,
    StartScreenSharingCallback,
    StopScreenSharingCallback,
    UpdatedLocalStreamCallback
} from "./MediaManager";
import {ScreenSharingPeer} from "./ScreenSharingPeer";
import {MESSAGE_TYPE_BLOCKED, MESSAGE_TYPE_CONSTRAINT, MESSAGE_TYPE_MESSAGE, VideoPeer} from "./VideoPeer";
import {RoomConnection} from "../Connexion/RoomConnection";
import {connectionManager} from "../Connexion/ConnectionManager";
import {GameConnexionTypes} from "../Url/UrlManager";
import {blackListManager} from "./BlackListManager";

export interface UserSimplePeerInterface{
    userId: number;
    name?: string;
    initiator?: boolean;
    webRtcUser?: string|undefined;
    webRtcPassword?: string|undefined;
}

export interface PeerConnectionListener {
    onConnect(user: UserSimplePeerInterface): void;

    onDisconnect(userId: number): void;
}

/**
 * This class manages connections to all the peers in the same group as me.
 */
export class SimplePeer {
    private Users: Array<UserSimplePeerInterface> = new Array<UserSimplePeerInterface>(); //todo: this array should be fusionned with PeerConnectionArray

    private PeerScreenSharingConnectionArray: Map<number, ScreenSharingPeer> = new Map<number, ScreenSharingPeer>();
    private PeerConnectionArray: Map<number, VideoPeer> = new Map<number, VideoPeer>();
    private readonly sendLocalVideoStreamCallback: UpdatedLocalStreamCallback;
    private readonly sendLocalScreenSharingStreamCallback: StartScreenSharingCallback;
    private readonly stopLocalScreenSharingStreamCallback: StopScreenSharingCallback;
    private readonly peerConnectionListeners: Array<PeerConnectionListener> = new Array<PeerConnectionListener>();
    private readonly userId: number;

    constructor(private Connection: RoomConnection, private enableReporting: boolean, private myName: string) {
        // We need to go through this weird bound function pointer in order to be able to "free" this reference later.
        this.sendLocalVideoStreamCallback = this.sendLocalVideoStream.bind(this);
        this.sendLocalScreenSharingStreamCallback = this.sendLocalScreenSharingStream.bind(this);
        this.stopLocalScreenSharingStreamCallback = this.stopLocalScreenSharingStream.bind(this);

        mediaManager.onUpdateLocalStream(this.sendLocalVideoStreamCallback);
        mediaManager.onStartScreenSharing(this.sendLocalScreenSharingStreamCallback);
        mediaManager.onStopScreenSharing(this.stopLocalScreenSharingStreamCallback);
        this.userId = Connection.getUserId();
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
            this.Connection.receiveWebrtcStart((message: UserSimplePeerInterface) => {
                this.receiveWebrtcStart(message);
            });

        }).catch((err) => {
            console.error("err", err);
        });

        this.Connection.disconnectMessage((data: WebRtcDisconnectMessageInterface): void => {
            this.closeConnection(data.userId);
        });
    }

    private receiveWebrtcStart(user: UserSimplePeerInterface): void {
        this.Users.push(user);
        // Note: the clients array contain the list of all clients (even the ones we are already connected to in case a user joints a group)
        // So we can receive a request we already had before. (which will abort at the first line of createPeerConnection)
        // This would be symmetrical to the way we handle disconnection.

        //start connection
        //console.log('receiveWebrtcStart. Initiator: ', user.initiator)
        if(!user.initiator){
            return;
        }
        this.createPeerConnection(user);
    }

    /**
     * create peer connection to bind users
     */
    private createPeerConnection(user : UserSimplePeerInterface) : VideoPeer | null {
        const peerConnection = this.PeerConnectionArray.get(user.userId)
        if (peerConnection) {
            if (peerConnection.destroyed) {
                peerConnection.toClose = true;
                peerConnection.destroy();
                const peerConnexionDeleted = this.PeerConnectionArray.delete(user.userId);
                if (!peerConnexionDeleted) {
                    throw 'Error to delete peer connection';
                }
                this.createPeerConnection(user);
            } else {
                peerConnection.toClose = false;
            }
            return null;
        }

        let name = user.name;
        if (!name) {
            const userSearch = this.Users.find((userSearch: UserSimplePeerInterface) => userSearch.userId === user.userId);
            if (userSearch) {
                name = userSearch.name;
            }
        }

        mediaManager.removeActiveVideo("" + user.userId);

        mediaManager.addActiveVideo(user, name);

        const peer = new VideoPeer(user, user.initiator ? user.initiator : false, this.Connection);

        //permit to send message
        mediaManager.addSendMessageCallback(user.userId,(message: string) => {
            peer.write(new Buffer(JSON.stringify({type: MESSAGE_TYPE_MESSAGE, name: this.myName.toUpperCase(), userId: this.userId, message: message})));
        });

        peer.toClose = false;
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
        const peerConnection = this.PeerScreenSharingConnectionArray.get(user.userId);
        if(peerConnection){
            if(peerConnection.destroyed){
                peerConnection.toClose = true;
                peerConnection.destroy();
                const peerConnexionDeleted = this.PeerScreenSharingConnectionArray.delete(user.userId);
                if(!peerConnexionDeleted){
                    throw 'Error to delete peer connection';
                }
                this.createPeerConnection(user);
            }else {
                peerConnection.toClose = false;
            }
            return null;
        }

        // We should display the screen sharing ONLY if we are not initiator
        if (!user.initiator) {
            mediaManager.removeActiveScreenSharingVideo("" + user.userId);
            mediaManager.addScreenSharingActiveVideo("" + user.userId);
        }

        const peer = new ScreenSharingPeer(user, user.initiator ? user.initiator : false, this.Connection);
        this.PeerScreenSharingConnectionArray.set(user.userId, peer);

        for (const peerConnectionListener of this.peerConnectionListeners) {
            peerConnectionListener.onConnect(user);
        }
        return peer;
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeConnection(userId : number) {
        mediaManager.playWebrtcOutSound();
        try {
            const peer = this.PeerConnectionArray.get(userId);
            if (peer === undefined) {
                console.warn("closeConnection => Tried to close connection for user "+userId+" but could not find user");
                return;
            }
            //create temp perr to close
            peer.toClose = true;
            peer.destroy();
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.

            this.closeScreenSharingConnection(userId);

            for (const peerConnectionListener of this.peerConnectionListeners) {
                peerConnectionListener.onDisconnect(userId);
            }
            const userIndex = this.Users.findIndex(user => user.userId === userId);
            if(userIndex < 0){
                throw 'Couln\'t delete user';
            } else {
                this.Users.splice(userIndex, 1);
            }
        } catch (err) {
            console.error("closeConnection", err)
        }

        //if user left discussion, clear array peer connection of sharing
        if(this.Users.length === 0) {
            for (const userId of this.PeerScreenSharingConnectionArray.keys()) {
                this.closeScreenSharingConnection(userId);
                this.PeerScreenSharingConnectionArray.delete(userId);
            }
        }
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeScreenSharingConnection(userId : number) {
        try {
            mediaManager.removeActiveScreenSharingVideo("" + userId);
            const peer = this.PeerScreenSharingConnectionArray.get(userId);
            if (peer === undefined) {
                console.warn("closeScreenSharingConnection => Tried to close connection for user "+userId+" but could not find user")
                return;
            }
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            peer.destroy();

            //Comment this peer connexion because if we delete and try to reshare screen, the RTCPeerConnection send renegociate event. This array will be remove when user left circle discussion
            /*if(!this.PeerScreenSharingConnectionArray.delete(userId)){
                throw 'Couln\'t delete peer screen sharing connexion';
            }*/
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
        if (blackListManager.isBlackListed(data.userId)) return;
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
                console.info('tentative to create new peer connexion');
                this.sendLocalScreenSharingStreamToUser(data.userId);
            }
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${data.userId}`, e);
            //Comment this peer connexion because if we delete and try to reshare screen, the RTCPeerConnection send renegociate event. This array will be remove when user left circle discussion
            //this.PeerScreenSharingConnectionArray.delete(data.userId);
            this.receiveWebrtcScreenSharingSignal(data);
        }
    }

    private pushVideoToRemoteUser(userId : number) {
        try {
            const PeerConnection = this.PeerConnectionArray.get(userId);
            if (!PeerConnection) {
                throw new Error('While adding media, cannot find user with ID ' + userId);
            }
            const localStream: MediaStream | null = mediaManager.localStream;
            PeerConnection.write(new Buffer(JSON.stringify({type: MESSAGE_TYPE_CONSTRAINT, ...mediaManager.constraintsMedia})));

            if(!localStream){
                return;
            }

            for (const track of localStream.getTracks()) {
                //todo: this is a ugly hack to reduce the amount of error in console. Find a better way.
                if ((track as any).added !== undefined) continue; // eslint-disable-line @typescript-eslint/no-explicit-any
                (track as any).added = true; // eslint-disable-line @typescript-eslint/no-explicit-any
                PeerConnection.addTrack(track, localStream);
            }
        }catch (e) {
            console.error(`pushVideoToRemoteUser => ${userId}`, e);
        }
    }

    private pushScreenSharingToRemoteUser(userId : number) {
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
        for (const user of this.Users) {
            this.pushVideoToRemoteUser(user.userId);
        }
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public sendLocalScreenSharingStream() {
        if (!mediaManager.localScreenCapture) {
            console.error('Could not find localScreenCapture to share')
            return;
        }

        for (const user of this.Users) {
            this.sendLocalScreenSharingStreamToUser(user.userId);
        }
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public stopLocalScreenSharingStream(stream: MediaStream) {
        for (const user of this.Users) {
            this.stopLocalScreenSharingStreamToUser(user.userId, stream);
        }
    }

    private sendLocalScreenSharingStreamToUser(userId: number): void {
        if (blackListManager.isBlackListed(userId)) return;
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

    private stopLocalScreenSharingStreamToUser(userId: number, stream: MediaStream): void {
        const PeerConnectionScreenSharing = this.PeerScreenSharingConnectionArray.get(userId);
        if (!PeerConnectionScreenSharing) {
            throw new Error('Weird, screen sharing connection to user ' + userId + 'not found')
        }

        console.log("updatedScreenSharing => destroy", PeerConnectionScreenSharing);

        // Stop sending stream and close peer connection if peer is not sending stream too
        PeerConnectionScreenSharing.stopPushingScreenSharingToRemoteUser(stream);

        if (!PeerConnectionScreenSharing.isReceivingScreenSharingStream()) {
            PeerConnectionScreenSharing.destroy();
            //Comment this peer connexion because if we delete and try to reshare screen, the RTCPeerConnection send renegociate event. This array will be remove when user left circle discussion
            //this.PeerScreenSharingConnectionArray.delete(userId);
        }
    }
}
