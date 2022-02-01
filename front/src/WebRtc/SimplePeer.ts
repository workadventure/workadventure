import type {
    WebRtcDisconnectMessageInterface,
    WebRtcSignalReceivedMessageInterface,
} from "../Connexion/ConnexionModels";
import { mediaManager, StartScreenSharingCallback, StopScreenSharingCallback } from "./MediaManager";
import { ScreenSharingPeer } from "./ScreenSharingPeer";
import { VideoPeer } from "./VideoPeer";
import type { RoomConnection } from "../Connexion/RoomConnection";
import { blackListManager } from "./BlackListManager";
import { get } from "svelte/store";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { playersStore } from "../Stores/PlayersStore";
import { peerStore, screenSharingPeerStore } from "../Stores/PeerStore";

export interface UserSimplePeerInterface {
    userId: number;
    initiator?: boolean;
    webRtcUser?: string | undefined;
    webRtcPassword?: string | undefined;
}

export type RemotePeer = VideoPeer | ScreenSharingPeer;

/**
 * This class manages connections to all the peers in the same group as me.
 */
export class SimplePeer {
    private Users: Array<UserSimplePeerInterface> = new Array<UserSimplePeerInterface>(); //todo: this array should be fusionned with PeerConnectionArray

    private PeerScreenSharingConnectionArray: Map<number, ScreenSharingPeer> = new Map<number, ScreenSharingPeer>();
    private PeerConnectionArray: Map<number, VideoPeer> = new Map<number, VideoPeer>();
    private readonly sendLocalScreenSharingStreamCallback: StartScreenSharingCallback;
    private readonly stopLocalScreenSharingStreamCallback: StopScreenSharingCallback;
    private readonly unsubscribers: (() => void)[] = [];
    private readonly userId: number;
    private lastWebrtcUserName: string | undefined;
    private lastWebrtcPassword: string | undefined;

    constructor(private Connection: RoomConnection) {
        //we make sure we don't get any old peer.
        peerStore.cleanupStore();
        screenSharingPeerStore.cleanupStore();
        // We need to go through this weird bound function pointer in order to be able to "free" this reference later.
        this.sendLocalScreenSharingStreamCallback = this.sendLocalScreenSharingStream.bind(this);
        this.stopLocalScreenSharingStreamCallback = this.stopLocalScreenSharingStream.bind(this);

        let localScreenCapture: MediaStream | null = null;

        //todo
        this.unsubscribers.push(
            screenSharingLocalStreamStore.subscribe((streamResult) => {
                if (streamResult.type === "error") {
                    // Let's ignore screen sharing errors, we will deal with those in a different way.
                    return;
                }

                if (streamResult.stream !== null) {
                    localScreenCapture = streamResult.stream;
                    this.sendLocalScreenSharingStream(localScreenCapture);
                } else {
                    if (localScreenCapture) {
                        this.stopLocalScreenSharingStream(localScreenCapture);
                        localScreenCapture = null;
                    }
                }
            })
        );

        this.userId = Connection.getUserId();
        this.initialise();
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise() {
        //receive signal by gemer
        this.Connection.webRtcSignalToClientMessageStream.subscribe((message: WebRtcSignalReceivedMessageInterface) => {
            this.receiveWebrtcSignal(message);
        });

        //receive signal by gemer
        this.Connection.webRtcScreenSharingSignalToClientMessageStream.subscribe(
            (message: WebRtcSignalReceivedMessageInterface) => {
                this.receiveWebrtcScreenSharingSignal(message);
            }
        );

        mediaManager.showMyCamera();

        //receive message start
        this.Connection.webRtcStartMessageStream.subscribe((message: UserSimplePeerInterface) => {
            this.receiveWebrtcStart(message);
        });

        this.Connection.webRtcDisconnectMessageStream.subscribe((data: WebRtcDisconnectMessageInterface): void => {
            this.closeConnection(data.userId);
        });
    }

    private receiveWebrtcStart(user: UserSimplePeerInterface): void {
        this.Users.push(user);
        // Note: the clients array contain the list of all clients (even the ones we are already connected to in case a user joins a group)
        // So we can receive a request we already had before. (which will abort at the first line of createPeerConnection)
        // This would be symmetrical to the way we handle disconnection.

        //start connection
        if (!user.initiator) {
            return;
        }

        this.createPeerConnection(user);
    }

    /**
     * create peer connection to bind users
     */
    private createPeerConnection(user: UserSimplePeerInterface): VideoPeer | null {
        const peerConnection = this.PeerConnectionArray.get(user.userId);
        if (peerConnection) {
            if (peerConnection.destroyed) {
                peerConnection.toClose = true;
                peerConnection.destroy();
                const peerConnexionDeleted = this.PeerConnectionArray.delete(user.userId);
                if (!peerConnexionDeleted) {
                    throw new Error("Error to delete peer connection");
                }
                //return this.createPeerConnection(user, localStream);
            } else {
                peerConnection.toClose = false;
                return null;
            }
        }

        const name = this.getName(user.userId);

        this.lastWebrtcUserName = user.webRtcUser;
        this.lastWebrtcPassword = user.webRtcPassword;

        const peer = new VideoPeer(user, user.initiator ? user.initiator : false, name, this.Connection);

        peer.toClose = false;
        // When a connection is established to a video stream, and if a screen sharing is taking place,
        // the user sharing screen should also initiate a connection to the remote user!
        peer.on("connect", () => {
            const streamResult = get(screenSharingLocalStreamStore);
            if (streamResult.type === "success" && streamResult.stream !== null) {
                this.sendLocalScreenSharingStreamToUser(user.userId, streamResult.stream);
            }
        });

        //Create a notification for first user in circle discussion
        if (this.PeerConnectionArray.size === 0) {
            mediaManager.createNotification(name);
        }
        this.PeerConnectionArray.set(user.userId, peer);

        peerStore.pushNewPeer(peer);
        return peer;
    }

    private getName(userId: number): string {
        return playersStore.getPlayerById(userId)?.name || "";
    }

    /**
     * create peer connection to bind users
     */
    private createPeerScreenSharingConnection(
        user: UserSimplePeerInterface,
        stream: MediaStream | null
    ): ScreenSharingPeer | null {
        const peerConnection = this.PeerScreenSharingConnectionArray.get(user.userId);
        if (peerConnection) {
            if (peerConnection.destroyed) {
                peerConnection.toClose = true;
                peerConnection.destroy();
                const peerConnexionDeleted = this.PeerScreenSharingConnectionArray.delete(user.userId);
                if (!peerConnexionDeleted) {
                    throw new Error("Error to delete peer connection");
                }
                this.createPeerConnection(user);
            } else {
                peerConnection.toClose = false;
            }
            return null;
        }

        // Enrich the user with last known credentials (if they are not set in the user object, which happens when a user triggers the screen sharing)
        if (user.webRtcUser === undefined) {
            user.webRtcUser = this.lastWebrtcUserName;
            user.webRtcPassword = this.lastWebrtcPassword;
        }

        const name = this.getName(user.userId);

        const peer = new ScreenSharingPeer(
            user,
            user.initiator ? user.initiator : false,
            name,
            this.Connection,
            stream
        );
        this.PeerScreenSharingConnectionArray.set(user.userId, peer);

        screenSharingPeerStore.pushNewPeer(peer);
        return peer;
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeConnection(userId: number) {
        try {
            const peer = this.PeerConnectionArray.get(userId);
            if (peer === undefined) {
                console.warn(
                    "closeConnection => Tried to close connection for user " + userId + " but could not find user"
                );
                return;
            }
            //create temp perr to close
            peer.toClose = true;
            peer.destroy();
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.

            this.closeScreenSharingConnection(userId);

            const userIndex = this.Users.findIndex((user) => user.userId === userId);
            if (userIndex < 0) {
                throw new Error("Couldn't delete user");
            } else {
                this.Users.splice(userIndex, 1);
            }
        } catch (err) {
            console.error("closeConnection", err);
        }

        //if user left discussion, clear array peer connection of sharing
        if (this.Users.length === 0) {
            for (const userId of this.PeerScreenSharingConnectionArray.keys()) {
                this.closeScreenSharingConnection(userId);
                this.PeerScreenSharingConnectionArray.delete(userId);
                screenSharingPeerStore.removePeer(userId);
            }
        }

        peerStore.removePeer(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeScreenSharingConnection(userId: number) {
        try {
            const peer = this.PeerScreenSharingConnectionArray.get(userId);
            if (peer === undefined) {
                console.warn(
                    "closeScreenSharingConnection => Tried to close connection for user " +
                        userId +
                        " but could not find user or no peer connection started"
                );
                return;
            }
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            peer.destroy();
        } catch (err) {
            console.error("closeConnection", err);
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
        for (const unsubscriber of this.unsubscribers) {
            unsubscriber();
        }
        peerStore.cleanupStore();
        screenSharingPeerStore.cleanupStore();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private receiveWebrtcSignal(data: WebRtcSignalReceivedMessageInterface) {
        try {
            //if offer type, create peer connection
            if (data.signal.type === "offer") {
                this.createPeerConnection(data);
            }
            const peer = this.PeerConnectionArray.get(data.userId);
            if (peer !== undefined) {
                peer.signal(data.signal);
            } else {
                console.error('Could not find peer whose ID is "' + data.userId + '" in PeerConnectionArray');
            }
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${data.userId}`, e);
        }
    }

    private receiveWebrtcScreenSharingSignal(data: WebRtcSignalReceivedMessageInterface) {
        const uuid = playersStore.getPlayerById(data.userId)?.userUuid || "";
        if (blackListManager.isBlackListed(uuid)) return;
        const streamResult = get(screenSharingLocalStreamStore);
        let stream: MediaStream | null = null;
        if (streamResult.type === "success" && streamResult.stream !== null) {
            stream = streamResult.stream;
        }

        try {
            //if offer type, create peer connection
            if (data.signal.type === "offer") {
                this.createPeerScreenSharingConnection(data, stream);
            }
            const peer = this.PeerScreenSharingConnectionArray.get(data.userId);
            if (peer !== undefined) {
                peer.signal(data.signal);
            } else {
                console.error(
                    'Could not find peer whose ID is "' + data.userId + '" in receiveWebrtcScreenSharingSignal'
                );
                console.info("Attempt to create new peer connection");
                if (stream) {
                    this.sendLocalScreenSharingStreamToUser(data.userId, stream);
                }
            }
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${data.userId}`, e);
            //Comment this peer connection because if we delete and try to reshare screen, the RTCPeerConnection send renegotiate event. This array will be remove when user left circle discussion
            this.receiveWebrtcScreenSharingSignal(data);
        }
    }

    private pushScreenSharingToRemoteUser(userId: number, localScreenCapture: MediaStream) {
        const PeerConnection = this.PeerScreenSharingConnectionArray.get(userId);
        if (!PeerConnection) {
            throw new Error("While pushing screen sharing, cannot find user with ID " + userId);
        }

        for (const track of localScreenCapture.getTracks()) {
            PeerConnection.addTrack(track, localScreenCapture);
        }
        return;
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public sendLocalScreenSharingStream(localScreenCapture: MediaStream) {
        for (const user of this.Users) {
            this.sendLocalScreenSharingStreamToUser(user.userId, localScreenCapture);
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

    private sendLocalScreenSharingStreamToUser(userId: number, localScreenCapture: MediaStream): void {
        const uuid = playersStore.getPlayerById(userId)?.userUuid || "";
        if (blackListManager.isBlackListed(uuid)) return;
        // If a connection already exists with user (because it is already sharing a screen with us... let's use this connection)
        if (this.PeerScreenSharingConnectionArray.has(userId)) {
            this.pushScreenSharingToRemoteUser(userId, localScreenCapture);
            return;
        }

        const screenSharingUser: UserSimplePeerInterface = {
            userId,
            initiator: true,
        };
        const PeerConnectionScreenSharing = this.createPeerScreenSharingConnection(
            screenSharingUser,
            localScreenCapture
        );
        if (!PeerConnectionScreenSharing) {
            return;
        }
    }

    private stopLocalScreenSharingStreamToUser(userId: number, stream: MediaStream): void {
        const PeerConnectionScreenSharing = this.PeerScreenSharingConnectionArray.get(userId);
        if (!PeerConnectionScreenSharing) {
            throw new Error("Weird, screen sharing connection to user " + userId + "not found");
        }

        console.log("updatedScreenSharing => destroy", PeerConnectionScreenSharing);

        // Stop sending stream and close peer connection if peer is not sending stream too
        PeerConnectionScreenSharing.stopPushingScreenSharingToRemoteUser(stream);

        if (!PeerConnectionScreenSharing.isReceivingScreenSharingStream()) {
            PeerConnectionScreenSharing.destroy();
        }
    }
}
