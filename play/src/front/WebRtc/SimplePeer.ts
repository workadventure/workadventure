import { get } from "svelte/store";
import { Subject, Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { Deferred } from "ts-deferred";
import type { WebRtcSignalReceivedMessageInterface } from "../Connection/ConnexionModels";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { playersStore } from "../Stores/PlayersStore";
//import { batchGetUserMediaStore } from "../Stores/MediaStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { nbSoundPlayedInBubbleStore } from "../Stores/ApparentMediaContraintStore";
import { SpaceFilterInterface } from "../Space/SpaceFilter/SpaceFilter";
import { RemotePlayersRepository } from "../Phaser/Game/RemotePlayersRepository";
import { BasicNotification, notificationManager } from "../Notification";
import LL from "../../i18n/i18n-svelte";
import { SpaceInterface } from "../Space/SpaceInterface";
//import { mediaManager } from "./MediaManager";
import { CommunicationType } from "../Livekit/LivekitConnection";
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
 *
 */

//TODO : Profiter que le simplePeer soit lié au space pour refacto et enlever les dépendance

export class SimplePeer {
    private readonly unsubscribers: (() => void)[] = [];
    private readonly rxJsUnsubscribers: Subscription[] = [];
    private lastWebrtcUserName: string | undefined;
    private lastWebrtcPassword: string | undefined;
    private spaceFilterDeferred = new Deferred<SpaceFilterInterface>();

    private readonly _videoPeerAdded = new Subject<VideoPeer>();
    public readonly videoPeerAdded = this._videoPeerAdded.asObservable();

    private readonly _videoPeerRemoved = new Subject<VideoPeer>();
    public readonly videoPeerRemoved = this._videoPeerRemoved.asObservable();

    private readonly _screenSharingPeerAdded = new Subject<ScreenSharingPeer>();
    public readonly screenSharingPeerAdded = this._screenSharingPeerAdded.asObservable();

    private readonly _screenSharingPeerRemoved = new Subject<ScreenSharingPeer>();
    public readonly screenSharingPeerRemoved = this._screenSharingPeerRemoved.asObservable();

    constructor(private space: SpaceInterface, private remotePlayersRepository: RemotePlayersRepository) {
        //we make sure we don't get any old peer.
        //TODO: no longer useful ?
        // peerStore.cleanupStore(this.space.getName());
        // screenSharingPeerStore.cleanupStore(this.space.getName());
        let localScreenCapture: MediaStream | undefined = undefined;

        //todo
        this.unsubscribers.push(
            screenSharingLocalStreamStore.subscribe((streamResult) => {
                if (streamResult.type === "error") {
                    // Let's ignore screen sharing errors, we will deal with those in a different way.
                    return;
                }

                if (streamResult.stream !== undefined) {
                    localScreenCapture = streamResult.stream;
                    this.sendLocalScreenSharingStream(localScreenCapture).catch((e) => {
                        console.error("Error while sending local screen sharing stream to user", e);
                        Sentry.captureException(e);
                    });
                } else {
                    if (localScreenCapture) {
                        this.stopLocalScreenSharingStream(localScreenCapture);
                        localScreenCapture = undefined;
                    }
                }
            })
        );

        console.log(">>>>> initialise");
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
            this.space.observePrivateEvent("webRtcSignalToClientMessage").subscribe((message) => {
                const webRtcSignalToClientMessage = message.webRtcSignalToClientMessage;

                const webRtcSignalReceivedMessage: WebRtcSignalReceivedMessageInterface = {
                    userId: message.sender,
                    signal: JSON.parse(webRtcSignalToClientMessage.signal),
                    webRtcUser: webRtcSignalToClientMessage.webRtcUserName,
                    webRtcPassword: webRtcSignalToClientMessage.webRtcPassword,
                };

                this.receiveWebrtcSignal(webRtcSignalReceivedMessage).catch((e) => {
                    console.error("Error while receiving WebRTC signal", e);
                    Sentry.captureException(e);
                });
            })
        );

        //receive signal by gemer
        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent("webRtcScreenSharingSignalToClientMessage").subscribe((message) => {
                const webRtcScreenSharingSignalToClientMessage = message.webRtcScreenSharingSignalToClientMessage;

                const webRtcSignalReceivedMessage: WebRtcSignalReceivedMessageInterface = {
                    userId: message.sender,
                    signal: JSON.parse(webRtcScreenSharingSignalToClientMessage.signal),
                    webRtcUser: webRtcScreenSharingSignalToClientMessage.webRtcUserName,
                    webRtcPassword: webRtcScreenSharingSignalToClientMessage.webRtcPassword,
                };

                this.receiveWebrtcScreenSharingSignal(webRtcSignalReceivedMessage).catch((e) => {
                    console.error("Error while receiving WebRTC signal", e);
                    Sentry.captureException(e);
                });
            })
        );

        /*
        batchGetUserMediaStore.startBatch();
        mediaManager.enableMyCamera();
        mediaManager.enableMyMicrophone();
        batchGetUserMediaStore.commitChanges();
        */

        //receive message start
        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent("webRtcStartMessage").subscribe((message) => {
                console.log(">>>>> webRtcStartMessage", message);
                const webRtcStartMessage = message.webRtcStartMessage;

                const user: UserSimplePeerInterface = {
                    userId: message.sender,
                    initiator: webRtcStartMessage.initiator,
                    webRtcUser: webRtcStartMessage.webRtcUserName,
                    webRtcPassword: webRtcStartMessage.webRtcPassword,
                };

                this.receiveWebrtcStart(user).catch((e) => {
                    console.error("Error while receiving WebRTC signal", e);
                    Sentry.captureException(e);
                });
            })
        );

        //receive message start
        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent("webRtcDisconnectMessage").subscribe((message) => {
                const user: UserSimplePeerInterface = {
                    userId: message.sender,
                };

                this.receiveWebrtcDisconnect(user);
            })
        );
    }

    private async receiveWebrtcStart(user: UserSimplePeerInterface): Promise<void> {
        // Note: the clients array contain the list of all clients (even the ones we are already connected to in case a user joins a group)
        // So we can receive a request we already had before. (which will abort at the first line of createPeerConnection)
        // This would be symmetrical to the way we handle disconnection.

        //start connection
        if (!user.initiator) {
            return;
        }

        await this.createPeerConnection(user);
    }

    private receiveWebrtcDisconnect(user: UserSimplePeerInterface): void {
        this.closeConnection(user.userId);
    }

    /**
     * create peer connection to bind users
     */
    private async createPeerConnection(user: UserSimplePeerInterface): Promise<VideoPeer | null> {
        const player = await this.remotePlayersRepository.getPlayer(user.userId);
        const uuid = player.userUuid;
        if (blackListManager.isBlackListed(uuid)) return null;

        const peerConnection = this.space.videoPeerStore.get(user.userId);
        if (peerConnection) {
            if (peerConnection.destroyed) {
                this._videoPeerRemoved.next(peerConnection);
                peerConnection.toClose = true;
                peerConnection.destroy();
                this.space.videoPeerStore.delete(user.userId);
            } else {
                peerConnection.toClose = false;
                return Promise.resolve(null);
            }
        }

        const name = player.name;

        this.lastWebrtcUserName = user.webRtcUser;
        this.lastWebrtcPassword = user.webRtcPassword;

        const peer = new VideoPeer(
            user,
            user.initiator ? user.initiator : false,
            player,
            this.space,
            this.spaceFilterDeferred.promise
        );

        peer.toClose = false;
        // When a connection is established to a video stream, and if a screen sharing is taking place,
        // the user sharing screen should also initiate a connection to the remote user!
        peer.on("connect", () => {
            const streamResult = get(screenSharingLocalStreamStore);
            if (streamResult.type === "success" && streamResult.stream !== undefined) {
                this.sendLocalScreenSharingStreamToUser(user.userId, streamResult.stream).catch((e) => {
                    console.error("Error while sending local screen sharing stream to user", e);
                    Sentry.captureException(e);
                });
            }

            // Now, in case a stream is generated from the scripting API, we need to send it to the new peer
            if (this.scriptingApiStream) {
                peer.addStream(this.scriptingApiStream);
            }
        });

        //Create a notification for first user in circle discussion
        if (this.space.videoPeerStore.size === 0) {
            const notificationText = get(LL).notification.discussion({ name });
            notificationManager.createNotification(new BasicNotification(notificationText));
        }

        analyticsClient.addNewParticipant(peer.uniqueId, user.userId, uuid);
        this.space.videoPeerStore.set(user.userId, peer);
        this._videoPeerAdded.next(peer);
        return peer;
    }

    /**
     * create peer connection to bind users
     */
    private async createPeerScreenSharingConnection(
        user: UserSimplePeerInterface,
        stream: MediaStream | undefined
    ): Promise<ScreenSharingPeer | null> {
        const peerScreenSharingConnection = this.space.screenSharingPeerStore.get(user.userId);
        if (peerScreenSharingConnection) {
            if (peerScreenSharingConnection.destroyed) {
                this._screenSharingPeerRemoved.next(peerScreenSharingConnection);
                peerScreenSharingConnection.toClose = true;
                peerScreenSharingConnection.destroy();
                this.space.screenSharingPeerStore.delete(user.userId);
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

        const player = await this.remotePlayersRepository.getPlayer(user.userId);

        const peer = new ScreenSharingPeer(
            user,
            user.initiator ? user.initiator : false,
            player,
            this.space,
            stream,
            this.spaceFilterDeferred.promise
        );

        // Create subscription to statusStore to close connection when user stop sharing screen
        // Is automatically unsubscribed when peer is destroyed
        this.unsubscribers.push(
            peer.statusStore.subscribe((status) => {
                if (status === "closed") {
                    if (!stream) {
                        this.closeScreenSharingConnection(user.userId);
                    } else {
                        this.stopLocalScreenSharingStreamToUser(user.userId, stream);
                    }
                }
            })
        );

        // When a connection is established to a video stream, and if a screen sharing is taking place,
        this.space.screenSharingPeerStore.set(user.userId, peer);
        this._screenSharingPeerAdded.next(peer);
        return peer;
    }

    public blockedFromRemotePlayer(userId: number) {
        this.closeConnection(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    public closeConnection(userId: number) {
        try {
            const peer = this.space.videoPeerStore.get(userId);
            if (!peer) {
                return;
            }
            this._videoPeerRemoved.next(peer);

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
        if (this.space.videoPeerStore.size === 0) {
            for (const userId of this.space.screenSharingPeerStore.keys()) {
                this.closeScreenSharingConnection(userId);
            }
        }

        this.space.videoPeerStore.delete(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeScreenSharingConnection(userId: number) {
        try {
            const peer = this.space.screenSharingPeerStore.get(userId);
            if (!peer) {
                return;
            }
            this._screenSharingPeerRemoved.next(peer);
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.
            peer.destroy();
        } catch (err) {
            console.error("An error occurred in closeScreenSharingConnection", err);
        }

        this.space.screenSharingPeerStore.delete(userId);
    }

    public closeAllConnections() {
        for (const userId of this.space.videoPeerStore.keys()) {
            this.closeConnection(userId);
        }

        for (const userId of this.space.screenSharingPeerStore.keys()) {
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

        this.cleanupStore();
    }

    public cleanupStore() {
        this.space.videoPeerStore.forEach((peer) => {
            peer.destroy();
            this.space.videoPeerStore.delete(peer.userId);
        });

        this.space.screenSharingPeerStore.forEach((peer) => {
            peer.destroy();
            this.space.screenSharingPeerStore.delete(peer.userId);
        });
    }

    private async receiveWebrtcSignal(data: WebRtcSignalReceivedMessageInterface): Promise<void> {
        try {
            //if offer type, create peer connection
            if (data.signal.type === "offer") {
                await this.createPeerConnection(data);
            }
            const peer = this.space.videoPeerStore.get(data.userId);
            if (peer) {
                peer.signal(data.signal);
            } else {
                console.error('Could not find peer whose ID is "' + data.userId + '" in PeerConnectionArray');
            }
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${data.userId}`, e);
        }
    }

    private async receiveWebrtcScreenSharingSignal(data: WebRtcSignalReceivedMessageInterface): Promise<void> {
        const uuid = (await this.remotePlayersRepository.getPlayer(data.userId)).userUuid;
        if (blackListManager.isBlackListed(uuid)) return;
        const streamResult = get(screenSharingLocalStreamStore);
        let stream: MediaStream | undefined = undefined;
        if (streamResult.type === "success" && streamResult.stream !== undefined) {
            stream = streamResult.stream;
        }

        try {
            //if offer type, create peer connection
            if (data.signal.type === "offer") {
                await this.createPeerScreenSharingConnection(data, stream);
            }
            const peer = this.space.screenSharingPeerStore.get(data.userId);
            if (peer !== undefined) {
                peer.signal(data.signal);
            } else {
                console.error(
                    'Could not find peer whose ID is "' + data.userId + '" in receiveWebrtcScreenSharingSignal'
                );
                console.info("Attempt to create new peer connection");
                if (stream) {
                    await this.sendLocalScreenSharingStreamToUser(data.userId, stream);
                }
            }
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${data.userId}`, e);
            //Comment this peer connection because if we delete and try to reshare screen, the RTCPeerConnection send renegotiate event. This array will be removed when user left circle discussion
            await this.receiveWebrtcScreenSharingSignal(data);
        }
    }

    private pushScreenSharingToRemoteUser(userId: number, localScreenCapture: MediaStream) {
        const PeerConnection = this.space.screenSharingPeerStore.get(userId);
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
        const promises: Promise<void>[] = [];
        for (const userId of this.space.videoPeerStore.keys()) {
            promises.push(this.sendLocalScreenSharingStreamToUser(userId, localScreenCapture));
        }
        return Promise.all(promises);
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public stopLocalScreenSharingStream(stream: MediaStream) {
        for (const userId of this.space.videoPeerStore.keys()) {
            this.stopLocalScreenSharingStreamToUser(userId, stream);
        }
    }

    private async sendLocalScreenSharingStreamToUser(userId: number, localScreenCapture: MediaStream): Promise<void> {
        const uuid = (await this.remotePlayersRepository.getPlayer(userId)).userUuid;
        if (blackListManager.isBlackListed(uuid)) return;
        // If a connection already exists with user (because it is already sharing a screen with us... let's use this connection)
        if (this.space.screenSharingPeerStore.has(userId)) {
            this.pushScreenSharingToRemoteUser(userId, localScreenCapture);
            return;
        }

        const screenSharingUser: UserSimplePeerInterface = {
            userId,
            initiator: true,
        };
        const PeerConnectionScreenSharing = await this.createPeerScreenSharingConnection(
            screenSharingUser,
            localScreenCapture
        );
        if (!PeerConnectionScreenSharing) {
            return;
        }
    }

    private stopLocalScreenSharingStreamToUser(userId: number, stream: MediaStream): void {
        const PeerConnectionScreenSharing = this.space.screenSharingPeerStore.get(userId);
        if (!PeerConnectionScreenSharing || !(PeerConnectionScreenSharing instanceof ScreenSharingPeer)) {
            return;
        }

        // Send message to stop screen sharing
        PeerConnectionScreenSharing.stopPushingScreenSharingToRemoteUser(stream);

        // If there are no more screen sharing streams, let's close the connection
        if (!PeerConnectionScreenSharing.isReceivingScreenSharingStream()) {
            // Send message to close screen sharing peer connection
            PeerConnectionScreenSharing.finishScreenSharingToRemoteUser();
            // Close the peer connection
            PeerConnectionScreenSharing.toClose = true;
            // Destroy the peer connection
            PeerConnectionScreenSharing.destroy();
            // Close the screen sharing connection
            this.closeScreenSharingConnection(PeerConnectionScreenSharing.userId);
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

                for (const videoPeer of this.space.videoPeerStore.values()) {
                    videoPeer.addStream(destination.stream);
                }
            })().catch(reject);
        });
    }

    private scriptingApiStream: MediaStream | undefined = undefined;

    /**
     * Sends the stream passed in parameter to all the peers.
     * Used to send streams generated by the scripting API.
     */
    public dispatchStream(mediaStream: MediaStream) {
        for (const videoPeer of this.space.videoPeerStore.values()) {
            videoPeer.addStream(mediaStream);
        }
        this.scriptingApiStream = mediaStream;
    }

    setSpaceFilter(spaceFilter: SpaceFilterInterface | undefined) {
        if (spaceFilter) {
            this.spaceFilterDeferred.resolve(spaceFilter);
        } else {
            this.spaceFilterDeferred = new Deferred<SpaceFilterInterface>();
        }
    }

    public removePeer(userId: number) {
        this.space.videoPeerStore.delete(userId);
        this.space.screenSharingPeerStore.delete(userId);
    }
}
