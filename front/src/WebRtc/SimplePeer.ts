import {
    WebRtcDisconnectMessageInterface,
    WebRtcSignalReceivedMessageInterface,
    WebRtcStartMessageInterface
} from "../Connexion/ConnexionModels";
import {
    mediaManager,
    StartScreenSharingCallback,
    StopScreenSharingCallback,
    UpdatedLocalStreamCallback
} from "./MediaManager";
import {ScreenSharingPeer} from "./ScreenSharingPeer";
import {VideoPeer} from "./VideoPeer";
import {RoomConnection} from "../Connexion/RoomConnection";

export interface UserSimplePeerInterface{
    userId: number;
    name?: string;
    initiator?: boolean;
}

export interface PeerConnectionListener {
    onConnect(user: UserSimplePeerInterface): void;

    onDisconnect(userId: number): void;
}

/**
 * This class manages connections to all the peers in the same group as me.
 */
export class SimplePeer {
    private Users: Array<UserSimplePeerInterface> = new Array<UserSimplePeerInterface>();

    private PeerScreenSharingConnectionArray: Map<number, ScreenSharingPeer> = new Map<number, ScreenSharingPeer>();
    private PeerConnectionArray: Map<number, VideoPeer> = new Map<number, VideoPeer>();
    private readonly sendLocalVideoStreamCallback: UpdatedLocalStreamCallback;
    private readonly sendLocalScreenSharingStreamCallback: StartScreenSharingCallback;
    private readonly stopLocalScreenSharingStreamCallback: StopScreenSharingCallback;
    private readonly peerConnectionListeners: Array<PeerConnectionListener> = new Array<PeerConnectionListener>();

    constructor(private Connection: RoomConnection, private enableReporting: boolean) {
        // We need to go through this weird bound function pointer in order to be able to "free" this reference later.
        this.sendLocalVideoStreamCallback = this.sendLocalVideoStream.bind(this);
        this.sendLocalScreenSharingStreamCallback = this.sendLocalScreenSharingStream.bind(this);
        this.stopLocalScreenSharingStreamCallback = this.stopLocalScreenSharingStream.bind(this);

        mediaManager.onUpdateLocalStream(this.sendLocalVideoStreamCallback);
        mediaManager.onStartScreenSharing(this.sendLocalScreenSharingStreamCallback);
        mediaManager.onStopScreenSharing(this.stopLocalScreenSharingStreamCallback);
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

    private receiveWebrtcStart(user: UserSimplePeerInterface) {
        //this.WebRtcRoomId = data.roomId;
        this.Users.push(user);
        // Note: the clients array contain the list of all clients (even the ones we are already connected to in case a user joints a group)
        // So we can receive a request we already had before. (which will abort at the first line of createPeerConnection)
        // TODO: refactor this to only send a message to connect to one user (rather than several users). => DONE
        // This would be symmetrical to the way we handle disconnection.
        //console.log('Start message', data);

        //start connection
        //this.startWebRtc();
        console.log('receiveWebrtcStart. Initiator: ', user.initiator)
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

        const reportCallback = this.enableReporting ? (comment: string) => {
            this.reportUser(user.userId, comment);
        } : undefined;

        mediaManager.addActiveVideo("" + user.userId, reportCallback, name);

        const peer = new VideoPeer(user.userId, user.initiator ? user.initiator : false, this.Connection);
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

        const peer = new ScreenSharingPeer(user.userId, user.initiator ? user.initiator : false, this.Connection);
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
    private closeConnection(userId : number) {
        try {
            //mediaManager.removeActiveVideo(userId);
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
        } catch (err) {
            console.error("closeConnection", err)
        }
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     *
     * @param userId
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
            //console.log('Closing connection with '+userId);
            peer.destroy();
            if(!this.PeerScreenSharingConnectionArray.delete(userId)){
                throw 'Couln\'t delete peer screen sharing connexion';
            }
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
            //force delete and recreate peer connexion
            this.PeerScreenSharingConnectionArray.delete(data.userId);
            this.receiveWebrtcScreenSharingSignal(data);
        }
    }

    /**
     *
     * @param userId
     */
    private pushVideoToRemoteUser(userId : number) {
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

    /**
     * Triggered locally when clicking on the report button
     */
    public reportUser(userId: number, message: string) {
        this.Connection.emitReportPlayerMessage(userId, message)
    }

    private sendLocalScreenSharingStreamToUser(userId: number): void {
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

            this.PeerScreenSharingConnectionArray.delete(userId);
        }
    }
}
