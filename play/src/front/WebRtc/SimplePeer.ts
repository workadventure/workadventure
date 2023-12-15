import { get } from "svelte/store";
import type { Subscription } from "rxjs";
import type {
    WebRtcDisconnectMessageInterface,
    WebRtcSignalReceivedMessageInterface,
} from "../Connection/ConnexionModels";
import type { RoomConnection } from "../Connection/RoomConnection";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { playersStore } from "../Stores/PlayersStore";
import { peerStore, screenSharingPeerStore } from "../Stores/PeerStore";
import { batchGetUserMediaStore } from "../Stores/MediaStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { nbSoundPlayedInBubbleStore } from "../Stores/ApparentMediaContraintStore";
import { mediaManager, NotificationType } from "./MediaManager";
import { ScreenSharingPeer } from "./ScreenSharingPeer";
import { VideoPeer } from "./VideoPeer";
import { blackListManager } from "./BlackListManager";

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
    private readonly unsubscribers: (() => void)[] = [];
    private readonly rxJsUnsubscribers: Subscription[] = [];
    private lastWebrtcUserName: string | undefined;
    private lastWebrtcPassword: string | undefined;

    constructor(private Connection: RoomConnection) {
        //we make sure we don't get any old peer.
        peerStore.cleanupStore();
        screenSharingPeerStore.cleanupStore();
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

        this.initialise();

        this.rxJsUnsubscribers.push(
            blackListManager.onBlockStream.subscribe((userUuid) => {
                const user = playersStore.getPlayerByUuid(userUuid);
                if (!user) {
                    return;
                }

                this.closeConnection(user.userId);
            })
        );
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise() {
        //receive signal by gemer
        this.rxJsUnsubscribers.push(
            this.Connection.webRtcSignalToClientMessageStream.subscribe(
                (message: WebRtcSignalReceivedMessageInterface) => {
                    this.receiveWebrtcSignal(message);
                }
            )
        );

        //receive signal by gemer
        this.rxJsUnsubscribers.push(
            this.Connection.webRtcScreenSharingSignalToClientMessageStream.subscribe(
                (message: WebRtcSignalReceivedMessageInterface) => {
                    this.receiveWebrtcScreenSharingSignal(message);
                }
            )
        );

        batchGetUserMediaStore.startBatch();
        mediaManager.enableMyCamera();
        mediaManager.enableMyMicrophone();
        batchGetUserMediaStore.commitChanges();

        //receive message start
        this.rxJsUnsubscribers.push(
            this.Connection.webRtcStartMessageStream.subscribe((message: UserSimplePeerInterface) => {
                this.receiveWebrtcStart(message);
            })
        );

        this.rxJsUnsubscribers.push(
            this.Connection.webRtcDisconnectMessageStream.subscribe((data: WebRtcDisconnectMessageInterface): void => {
                this.closeConnection(data.userId);
            })
        );
    }

    private receiveWebrtcStart(user: UserSimplePeerInterface): void {
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
        const uuid = playersStore.getPlayerById(user.userId)?.userUuid || "";
        if (blackListManager.isBlackListed(uuid)) return null;

        const peerConnection = peerStore.getPeer(user.userId);
        if (peerConnection) {
            if (peerConnection.destroyed) {
                peerConnection.toClose = true;
                peerConnection.destroy();
                peerStore.removePeer(user.userId);
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
        if (peerStore.getSize() === 0) {
            mediaManager.createNotification(name, NotificationType.discussion);
        }

        analyticsClient.addNewParticipant();
        peerStore.addPeer(user.userId, peer);
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
        const peerScreenSharingConnection = screenSharingPeerStore.getPeer(user.userId);
        if (peerScreenSharingConnection) {
            if (peerScreenSharingConnection.destroyed) {
                peerScreenSharingConnection.toClose = true;
                peerScreenSharingConnection.destroy();
                screenSharingPeerStore.removePeer(user.userId);
            } else {
                peerScreenSharingConnection.toClose = false;
                return null;
            }
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

        screenSharingPeerStore.addPeer(user.userId, peer);
        return peer;
    }

    public blockedFromRemotePlayer(userId: number) {
        this.closeConnection(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeConnection(userId: number) {
        try {
            const peer = peerStore.getPeer(userId);
            if (peer === undefined) {
                return;
            }
            //create temp peer to close
            peer.toClose = true;
            peer.destroy();
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.

            this.closeScreenSharingConnection(userId);
        } catch (err) {
            console.error("An error occurred in closeConnection", err);
        }

        //if the user left the discussion, clear screen sharing.
        if (peerStore.getSize() === 0) {
            for (const userId of get(screenSharingPeerStore).keys()) {
                this.closeScreenSharingConnection(userId);
            }
        }

        peerStore.removePeer(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeScreenSharingConnection(userId: number) {
        try {
            const peer = screenSharingPeerStore.getPeer(userId);
            if (peer === undefined) {
                return;
            }
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            peer.destroy();
        } catch (err) {
            console.error("An error occurred in closeScreenSharingConnection", err);
        }

        screenSharingPeerStore.removePeer(userId);
    }

    public closeAllConnections() {
        for (const userId of get(peerStore).keys()) {
            this.closeConnection(userId);
        }

        for (const userId of get(screenSharingPeerStore).keys()) {
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
        for (const subscription of this.rxJsUnsubscribers) {
            subscription.unsubscribe();
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
            const peer = peerStore.getPeer(data.userId);
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
            const peer = screenSharingPeerStore.getPeer(data.userId);
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
        const PeerConnection = screenSharingPeerStore.getPeer(userId);
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
        for (const userId of get(peerStore).keys()) {
            this.sendLocalScreenSharingStreamToUser(userId, localScreenCapture);
        }
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public stopLocalScreenSharingStream(stream: MediaStream) {
        for (const userId of get(peerStore).keys()) {
            this.stopLocalScreenSharingStreamToUser(userId, stream);
        }
    }

    private sendLocalScreenSharingStreamToUser(userId: number, localScreenCapture: MediaStream): void {
        const uuid = playersStore.getPlayerById(userId)?.userUuid || "";
        if (blackListManager.isBlackListed(uuid)) return;
        // If a connection already exists with user (because it is already sharing a screen with us... let's use this connection)
        if (get(screenSharingPeerStore).has(userId)) {
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
        const PeerConnectionScreenSharing = screenSharingPeerStore.getPeer(userId);
        if (!PeerConnectionScreenSharing) {
            throw new Error("Weird, screen sharing connection to user " + userId + "not found");
        }

        // Stop sending stream and close peer connection if peer is not sending stream too
        PeerConnectionScreenSharing.stopPushingScreenSharingToRemoteUser(stream);

        if (!PeerConnectionScreenSharing.isReceivingScreenSharingStream()) {
            PeerConnectionScreenSharing.toClose = true;
            PeerConnectionScreenSharing.destroy();
            screenSharingPeerStore.removePeer(PeerConnectionScreenSharing.userId);
        }
    }

    public dispatchSound(url: URL) {
        return new Promise<void>((resolve, reject) => {
            (async () => {
                // TODO: create only one?
                const audioContext = new AudioContext();

                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const destination = audioContext.createMediaStreamDestination();
                const bufferSource = audioContext.createBufferSource();
                bufferSource.buffer = audioBuffer;
                bufferSource.start(0);
                bufferSource.connect(destination);
                bufferSource.onended = () => {
                    nbSoundPlayedInBubbleStore.soundEnded();
                    resolve();
                };
                nbSoundPlayedInBubbleStore.soundStarted();

                for (const videoPeer of get(peerStore).values()) {
                    videoPeer.addStream(destination.stream);
                }
            })().catch(reject);
        });
    }
}
