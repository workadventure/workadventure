import { get } from "svelte/store";
import { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { Deferred } from "ts-deferred";
import type { WebRtcSignalReceivedMessageInterface } from "../Connection/ConnexionModels";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { playersStore } from "../Stores/PlayersStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { nbSoundPlayedInBubbleStore } from "../Stores/ApparentMediaContraintStore";
import { RemotePlayersRepository } from "../Phaser/Game/RemotePlayersRepository";
import { BubbleNotification as BasicNotification } from "../Notification/BubbleNotification";
import { notificationManager } from "../Notification/NotificationManager";
import LL from "../../i18n/i18n-svelte";
import { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import { ScreenSharingPeer } from "./ScreenSharingPeer";
import { VideoPeer } from "./VideoPeer";
import { blackListManager } from "./BlackListManager";
import { customWebRTCLogger } from "./CustomWebRTCLogger";

export interface UserSimplePeerInterface {
    userId: string;
    initiator?: boolean;
    webRtcUser?: string | undefined;
    webRtcPassword?: string | undefined;
}

export type RemotePeer = VideoPeer | ScreenSharingPeer;

/**
 * This class manages connections to all the peers in the same group as me.
 *
 */
export class SimplePeer {
    private readonly _unsubscribers: (() => void)[] = [];
    private readonly _rxJsUnsubscribers: Subscription[] = [];
    private _lastWebrtcUserName: string | undefined;
    private _lastWebrtcPassword: string | undefined;
    private spaceDeferred = new Deferred<SpaceInterface>();

    private _pendingConnections: Map<string, AbortController> = new Map();

    constructor(
        private _space: SpaceInterface,
        private _remotePlayersRepository: RemotePlayersRepository,
        private _streamableSubjects: StreamableSubjects,
        private _screenSharingLocalStreamStore = screenSharingLocalStreamStore,
        private _playersStore = playersStore,
        private _analyticsClient = analyticsClient,
        private _nbSoundPlayedInBubbleStore = nbSoundPlayedInBubbleStore,
        private _notificationManager = notificationManager,
        private _LL = LL,
        private _customWebRTCLogger = customWebRTCLogger,
        private _blackListManager = blackListManager
    ) {
        //we make sure we don't get any old peer.
        //TODO: no longer useful ?
        // peerStore.cleanupStore(this.space.getName());
        // screenSharingPeerStore.cleanupStore(this.space.getName());
        let localScreenCapture: MediaStream | undefined = undefined;
        // this.videoPeerStore = this.space.livekitVideoStreamStore
        // this.screenSharingPeerStore = this.space.screenSharingPeerStore

        this._unsubscribers.push(
            this._screenSharingLocalStreamStore.subscribe((streamResult) => {
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

        this.initialise();

        this._rxJsUnsubscribers.push(
            this._blackListManager.onBlockStream.subscribe((userUuid) => {
                const user = this._playersStore.getPlayerByUuid(userUuid);
                if (!user) {
                    return;
                }

                this._space
                    .getSpaceUserByUserId(user.userId)
                    .then((spaceUser) => {
                        if (!spaceUser) {
                            console.error("spaceUserId not found for userId", user.userId);
                            return;
                        }
                        this.closeConnection(spaceUser.spaceUserId);
                    })
                    .catch((e) => {
                        console.error("Error while getting space user by user id", e);
                    });
            })
        );
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise() {
        //receive signal by gemer
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcSignalToClientMessage").subscribe((message) => {
                const webRtcSignalToClientMessage = message.webRtcSignalToClientMessage;

                const webRtcSignalReceivedMessage: WebRtcSignalReceivedMessageInterface = {
                    userId: message.sender.spaceUserId,
                    signal: JSON.parse(webRtcSignalToClientMessage.signal),
                    webRtcUser: webRtcSignalToClientMessage.webRtcUserName,
                    webRtcPassword: webRtcSignalToClientMessage.webRtcPassword,
                };

                this.receiveWebrtcSignal(webRtcSignalReceivedMessage, message.sender).catch((e) => {
                    console.error("Error while receiving WebRTC signal", e);
                    Sentry.captureException(e);
                });
            })
        );

        //receive signal by gemer
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcScreenSharingSignalToClientMessage").subscribe((message) => {
                const webRtcScreenSharingSignalToClientMessage = message.webRtcScreenSharingSignalToClientMessage;

                const webRtcSignalReceivedMessage: WebRtcSignalReceivedMessageInterface = {
                    userId: message.sender.spaceUserId,
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
        this._rxJsUnsubscribers.push(
            //TODO : changer directement le message pour avoir le spaceUser directement ....
            this._space.observePrivateEvent("webRtcStartMessage").subscribe((message) => {
                const webRtcStartMessage = message.webRtcStartMessage;

                const user: UserSimplePeerInterface = {
                    userId: message.sender.spaceUserId,
                    initiator: webRtcStartMessage.initiator,
                    webRtcUser: webRtcStartMessage.webRtcUserName,
                    webRtcPassword: webRtcStartMessage.webRtcPassword,
                };

                //TODO : voir si on peut avoir le spaceUser directement dans le userSimplePeerInterface
                this.receiveWebrtcStart(user, message.sender).catch((e) => {
                    console.error("Error while receiving WebRTC signal", e);
                    Sentry.captureException(e);
                });
            })
        );

        //receive message start
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcDisconnectMessage").subscribe((message) => {
                const user: UserSimplePeerInterface = {
                    userId: message.sender.spaceUserId,
                };

                this.receiveWebrtcDisconnect(user);
            })
        );
    }

    private async receiveWebrtcStart(user: UserSimplePeerInterface, spaceUser: SpaceUserExtended): Promise<void> {
        // Note: the clients array contain the list of all clients (even the ones we are already connected to in case a user joins a group)
        // So we can receive a request we already had before. (which will abort at the first line of createPeerConnection)
        // This would be symmetrical to the way we handle disconnection.

        //start connection
        if (!user.initiator) {
            return;
        }

        this._pendingConnections.set(user.userId, new AbortController());

        const extendedSpaceUser = await this._space.extendSpaceUser(spaceUser);
        await this.createPeerConnection(user, extendedSpaceUser);

        this._pendingConnections.delete(user.userId);
    }

    private receiveWebrtcDisconnect(user: UserSimplePeerInterface): void {
        this.closeConnection(user.userId, true);
    }

    /**
     * create peer connection to bind users
     */
    private async createPeerConnection(
        user: UserSimplePeerInterface,
        spaceUser: SpaceUserExtended
    ): Promise<VideoPeer | null> {
        //TOOD : pas forcement la bonne maniere de faire on peut creer une connection avec un user qui n'est pas dans le space dans le cas d'un watcher qui ne stream pas / trouver une autre solution ==> pusher qui renvoie directement le spaceUSer ?

        const player = await spaceUser.getPlayer();
        if (!player) {
            console.error("While creating peer connection, cannot find player with ID " + user.userId);
            return null;
        }

        const uuid = player.userUuid;
        if (this._blackListManager.isBlackListed(uuid)) return null;

        const peerConnection = this._space.allVideoStreamStore.get(user.userId);
        if (peerConnection && peerConnection instanceof VideoPeer) {
            if (peerConnection.destroyed) {
                this._streamableSubjects.videoPeerRemoved.next(peerConnection.media);
                peerConnection.toClose = true;
                peerConnection.destroy();

                //this.space.livekitVideoStreamStore.delete(user.userId);
            } else {
                peerConnection.toClose = false;
                return Promise.resolve(null);
            }
        }

        const name = player.name;

        this._lastWebrtcUserName = user.webRtcUser;
        this._lastWebrtcPassword = user.webRtcPassword;

        const controller = this._pendingConnections.get(user.userId);
        if (controller && controller.signal.aborted) {
            this._pendingConnections.delete(user.userId);
            return null;
        }

        const peer = new VideoPeer(user, user.initiator ? user.initiator : false, player, this._space, spaceUser);

        peer.toClose = false;

        // When a connection is established to a video stream, and if a screen sharing is taking place,
        // the user sharing screen should also initiate a connection to the remote user!

        // Event listener is valid for the lifetime of the object and will be garbage collected when the object is destroyed
        // eslint-disable-next-line listeners/no-missing-remove-event-listener, listeners/no-inline-function-event-listener
        peer.on("connect", () => {
            const streamResult = get(this._screenSharingLocalStreamStore);
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
        if (this._space.allVideoStreamStore.size === 0) {
            const notificationText = get(LL).notification.discussion({ name });
            this._notificationManager.createNotification(new BasicNotification(notificationText));
        }

        this._analyticsClient.addNewParticipant(peer.uniqueId, user.userId, uuid);

        this._space.allVideoStreamStore.set(user.userId, peer);
        this._streamableSubjects.videoPeerAdded.next(peer.media);
        return peer;
    }

    /**
     * create peer connection to bind users
     */
    private async createPeerScreenSharingConnection(
        user: UserSimplePeerInterface,
        stream: MediaStream | undefined
    ): Promise<ScreenSharingPeer | null> {
        //const peerScreenSharingConnection = this.space.screenSharingPeerStore.get(user.userId);
        const peerScreenSharingConnection = this._space.allScreenShareStreamStore.get(user.userId);

        if (peerScreenSharingConnection && peerScreenSharingConnection instanceof ScreenSharingPeer) {
            if (peerScreenSharingConnection.destroyed) {
                this._streamableSubjects.screenSharingPeerRemoved.next(peerScreenSharingConnection.media);
                //peerScreenSharingConnection.toClose = true;
                //peerScreenSharingConnection.destroy();
                //this.space.screenSharingPeerStore.delete(user.userId);
            } else {
                peerScreenSharingConnection.toClose = false;
                return null;
            }
        }

        // Enrich the user with last known credentials (if they are not set in the user object, which happens when a user triggers the screen sharing)
        if (user.webRtcUser === undefined) {
            user.webRtcUser = this._lastWebrtcUserName;
            user.webRtcPassword = this._lastWebrtcPassword;
        }

        const spaceUser = await this._space.getSpaceUserBySpaceUserId(user.userId);
        if (!spaceUser) {
            console.error(
                "While creating peer screen sharing connection, cannot find space user with ID " + user.userId
            );
            return null;
        }
        const userId = spaceUser.userId;

        const player = await this._remotePlayersRepository.getPlayer(userId);

        const peer = new ScreenSharingPeer(
            user,
            user.initiator ? user.initiator : false,
            player,
            stream,
            this._space,
            spaceUser,
            false
        );

        // Create subscription to statusStore to close connection when user stop sharing screen
        // Is automatically unsubscribed when peer is destroyed
        this._unsubscribers.push(
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

        this._space.allScreenShareStreamStore.set(user.userId, peer);
        this._streamableSubjects.screenSharingPeerAdded.next(peer.media);
        return peer;
    }

    public blockedFromRemotePlayer(userId: string) {
        this.closeConnection(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    public closeConnection(userId: string, shouldCloseStream = true) {
        //TODO : voir comment adapter cette partie pour le switch (flag ou fonction spécifique pour le switch)
        const controller = this._pendingConnections.get(userId);
        if (controller) {
            controller.abort();
            return;
        }

        try {
            const peer = this._space.allVideoStreamStore.get(userId);
            if (!peer || !(peer instanceof VideoPeer)) {
                return;
            }
            this._streamableSubjects.videoPeerRemoved.next(peer.media);

            const videoElements = this._space.spacePeerManager.videoContainerMap.get(userId);

            if (videoElements) {
                videoElements.forEach((videoElement) => {
                    peer.media.detach(videoElement);
                });
            }

            //create temp peer to close
            if (shouldCloseStream) {
                peer.toClose = true;
                peer.destroy();
                this._space.allVideoStreamStore.delete(userId);
                this._space.spacePeerManager.videoContainerMap.delete(userId);
            }
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.

            this.closeScreenSharingConnection(userId, shouldCloseStream);
        } catch (err) {
            console.error("An error occurred in closeConnection", err);
        }

        //if the user left the discussion, clear screen sharing.
        if (this._space.allVideoStreamStore.size === 0) {
            for (const userId of this._space.allScreenShareStreamStore.keys()) {
                this.closeScreenSharingConnection(userId);
            }
        }

        //this.space.livekitVideoStreamStore.delete(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeScreenSharingConnection(userId: string, shouldCloseStream = true) {
        //TODO : voir comment adapter cette partie pour le switch (flag ou fonction spécifique pour le switch)
        try {
            const peer = this._space.allScreenShareStreamStore.get(userId);
            if (!peer) {
                return;
            }

            this._streamableSubjects.screenSharingPeerRemoved.next(peer.media);
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.

            if (shouldCloseStream && peer instanceof ScreenSharingPeer) {
                peer.destroy();

                const screenShareElements = this._space.spacePeerManager.screenShareContainerMap.get(userId) || [];
                screenShareElements.forEach((screenShareElement) => {
                    peer.media.detach(screenShareElement);
                });
            }
        } catch (err) {
            console.error("An error occurred in closeScreenSharingConnection", err);
        }

        if (shouldCloseStream) {
            this._space.allScreenShareStreamStore.delete(userId);
        }
    }

    //TODO : voir si on fait 2 fonctions / 1 pour close complet et l'autre pour la transition (sans close le stream et delete dans le store)
    public closeAllConnections(needToDelete?: boolean) {
        for (const userId of this._space.allVideoStreamStore.keys()) {
            this.closeConnection(userId, needToDelete);
        }

        for (const userId of this._space.allScreenShareStreamStore.keys()) {
            this.closeScreenSharingConnection(userId, needToDelete);
        }
    }

    /**
     * Unregisters any held event handler.
     */
    public unregister() {
        for (const unsubscriber of this._unsubscribers) {
            unsubscriber();
        }
        for (const subscription of this._rxJsUnsubscribers) {
            subscription.unsubscribe();
        }

        this.cleanupStore();
    }

    public cleanupStore() {
        //TODO : voir comment adapter cette partie pour le switch (flag ou fonction spécifique pour le switch)
        this._space.allVideoStreamStore.forEach((peer) => {
            if (peer instanceof VideoPeer) {
                //peer.destroy();
                //this.space.livekitVideoStreamStore.delete(peer.user.userId);
            }
        });

        this._space.allScreenShareStreamStore.forEach((peer) => {
            if (peer instanceof ScreenSharingPeer) {
                //peer.destroy();
                ///this.space.screenSharingPeerStore.delete(peer.user.userId);
            }
        });
    }

    private async receiveWebrtcSignal(
        data: WebRtcSignalReceivedMessageInterface,
        spaceUser: SpaceUserExtended
    ): Promise<void> {
        try {
            //if offer type, create peer connection
            if (data.signal.type === "offer") {
                const extendedSpaceUser = await this._space.extendSpaceUser(spaceUser);
                await this.createPeerConnection(data, extendedSpaceUser);
            }
            const peer = this._space.allVideoStreamStore.get(data.userId);

            if (!(peer instanceof VideoPeer)) {
                console.error("peer is not a VideoPeer");
                return;
            }

            if (peer && peer instanceof VideoPeer) {
                peer.signal(data.signal);
            } else {
                console.error('Could not find peer whose ID is "' + data.userId + '" in PeerConnectionArray');
            }
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${data.userId}`, e);
        }
    }

    //TODO : repasser dans les fonctions et bien faire la différence entre les userID et le spaceUserId
    private async receiveWebrtcScreenSharingSignal(data: WebRtcSignalReceivedMessageInterface): Promise<void> {
        const spaceUser = await this._space.getSpaceUserBySpaceUserId(data.userId);

        if (!spaceUser) {
            console.error(
                "While receiving webrtc screen sharing signal, cannot find space user with ID " + data.userId
            );
            return;
        }

        const player = await spaceUser.getPlayer();

        if (!player) {
            console.error("While receiving webrtc screen sharing signal, cannot find player with ID " + data.userId);
            return;
        }

        const uuid = player.userUuid;

        if (this._blackListManager.isBlackListed(uuid)) return;
        const streamResult = get(this._screenSharingLocalStreamStore);
        let stream: MediaStream | undefined = undefined;
        if (streamResult.type === "success" && streamResult.stream !== undefined) {
            stream = streamResult.stream;
        }

        try {
            //if offer type, create peer connection
            if (data.signal.type === "offer") {
                await this.createPeerScreenSharingConnection(data, stream);
            }
            const peer = this._space.allScreenShareStreamStore.get(data.userId);
            if (peer !== undefined && peer instanceof ScreenSharingPeer) {
                peer.signal(data.signal);
            } else {
                console.error(
                    'Could not find peer whose ID is "' + data.userId + '" in receiveWebrtcScreenSharingSignal'
                );
                this._customWebRTCLogger.info("Attempt to create new peer connection");
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

    private pushScreenSharingToRemoteUser(userId: string, localScreenCapture: MediaStream) {
        const PeerConnection = this._space.allScreenShareStreamStore.get(userId);
        if (!PeerConnection) {
            throw new Error("While pushing screen sharing, cannot find user with ID " + userId);
        }

        if (!(PeerConnection instanceof ScreenSharingPeer)) {
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
        for (const userId of this._space.allVideoStreamStore.keys()) {
            promises.push(this.sendLocalScreenSharingStreamToUser(userId, localScreenCapture));
        }
        return Promise.all(promises);
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public stopLocalScreenSharingStream(stream: MediaStream) {
        for (const userId of this._space.allVideoStreamStore.keys()) {
            this.stopLocalScreenSharingStreamToUser(userId, stream);
        }
    }

    private async sendLocalScreenSharingStreamToUser(userId: string, localScreenCapture: MediaStream): Promise<void> {
        const spaceUser = await this._space.getSpaceUserBySpaceUserId(userId);
        if (!spaceUser) {
            console.error("While sending local screen sharing, cannot find user with ID " + userId);
            return;
        }
        const userIdNumber = spaceUser.userId;
        const uuid = (await this._remotePlayersRepository.getPlayer(userIdNumber)).userUuid;
        if (this._blackListManager.isBlackListed(uuid)) return;
        // If a connection already exists with user (because it is already sharing a screen with us... let's use this connection)
        if (this._space.allScreenShareStreamStore.has(userId)) {
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

    private stopLocalScreenSharingStreamToUser(userId: string, stream: MediaStream): void {
        const PeerConnectionScreenSharing = this._space.allScreenShareStreamStore.get(userId);
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
            this.closeScreenSharingConnection(userId);
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

                for (const videoPeer of this._space.allVideoStreamStore.values()) {
                    if (videoPeer instanceof VideoPeer) {
                        videoPeer.addStream(destination.stream);
                    }
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
        for (const videoPeer of this._space.allVideoStreamStore.values()) {
            if (videoPeer instanceof VideoPeer) {
                videoPeer.addStream(mediaStream);
            }
        }
        this.scriptingApiStream = mediaStream;
    }

    setSpace(spaceFilter: SpaceInterface | undefined) {
        if (spaceFilter) {
            this.spaceDeferred.resolve(spaceFilter);
        } else {
            this.spaceDeferred = new Deferred<SpaceInterface>();
        }
    }

    public removePeer(userId: string) {
        // this.space.livekitVideoStreamStore.delete(userId);
        // this.space.screenSharingPeerStore.delete(userId);
    }
}
