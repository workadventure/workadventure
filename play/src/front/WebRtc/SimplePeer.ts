import * as Sentry from "@sentry/svelte";
import { get, readable, Readable } from "svelte/store";
import { Subscription } from "rxjs";
import { SignalData } from "simple-peer";
import type { WebRtcSignalReceivedMessageInterface } from "../Connection/ConnexionModels";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { playersStore } from "../Stores/PlayersStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { BubbleNotification as BasicNotification } from "../Notification/BubbleNotification";
import { notificationManager } from "../Notification/NotificationManager";
import LL from "../../i18n/i18n-svelte";
import { SimplePeerConnectionInterface, StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import { Streamable } from "../Stores/StreamableCollectionStore";
import { stableLocalStreamStore } from "../Stores/MediaStore";
import { apparentMediaContraintStore } from "../Stores/ApparentMediaContraintStore";
import { RemotePeer } from "./RemotePeer";
import { customWebRTCLogger } from "./CustomWebRTCLogger";
import { iceServersManager } from "./IceServersManager";

export interface UserSimplePeerInterface {
    userId: string;
    initiator?: boolean;
}

/**
 * This class manages connections to all the peers in the same group as me.
 *
 */
export class SimplePeer implements SimplePeerConnectionInterface {
    private readonly _unsubscribers: (() => void)[] = [];
    private readonly _rxJsUnsubscribers: Subscription[] = [];

    // A map of all screen sharing peers, indexed by spaceUserId
    private screenSharePeers: Map<string, RemotePeer> = new Map();
    // A map of all video peers, indexed by spaceUserId
    private videoPeers: Map<string, RemotePeer> = new Map();
    private abortController = new AbortController();

    constructor(
        private _space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>,
        private _screenSharingLocalStreamStore = screenSharingLocalStreamStore,
        private _playersStore = playersStore,
        private _analyticsClient = analyticsClient,
        private _notificationManager = notificationManager,
        private _customWebRTCLogger = customWebRTCLogger,
        private _localStreamStore = stableLocalStreamStore
    ) {
        let isStreaming: boolean = false;

        this._unsubscribers.push(
            this._screenSharingLocalStreamStore.subscribe((streamResult) => {
                if (streamResult && streamResult.type === "error") {
                    // Let's ignore screen sharing errors, we will deal with those in a different way.
                    return;
                }

                if (streamResult.stream !== undefined) {
                    isStreaming = true;
                    this.sendLocalScreenSharingStream(streamResult.stream);
                } else {
                    if (isStreaming) {
                        this.stopLocalScreenSharingStream();
                        isStreaming = false;
                    }
                }
            })
        );

        this.initialise();
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise() {
        //receive signal by gemer
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcSignal").subscribe((message) => {
                console.log("AAAAAAAAAAAAAAAAAAAAA webRtcSignal from ", message.sender.spaceUserId);
                const webRtcSignalToClientMessage = message.webRtcSignal;

                this.receiveWebrtcSignal(JSON.parse(webRtcSignalToClientMessage.signal) as SignalData, message.sender);
            })
        );

        //receive signal by gemer
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcScreenSharingSignal").subscribe((message) => {
                console.log("AAAAAAAAAAAAAAAAAAAAA webRtcScreenSharingSignal from ", message.sender.spaceUserId);
                const webRtcScreenSharingSignalToClientMessage = message.webRtcScreenSharingSignal;

                const webRtcSignalReceivedMessage: WebRtcSignalReceivedMessageInterface = {
                    userId: message.sender.spaceUserId,
                    signal: JSON.parse(webRtcScreenSharingSignalToClientMessage.signal),
                };

                this.receiveWebrtcScreenSharingSignal(webRtcSignalReceivedMessage, message.sender).catch((e) => {
                    console.error(`receiveWebrtcScreenSharingSignal => ${webRtcSignalReceivedMessage.userId}`, e);
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
            this._space.observePrivateEvent("webRtcStartMessage").subscribe((message) => {
                console.log("AAAAAAAAAAAAAAAAAAAAA webRtcStartMessage from ", message.sender.spaceUserId);
                const webRtcStartMessage = message.webRtcStartMessage;

                const user: UserSimplePeerInterface = {
                    userId: message.sender.spaceUserId,
                    initiator: webRtcStartMessage.initiator,
                };

                this.receiveWebrtcStart(user, message.sender);
            })
        );

        //receive message start
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcDisconnectMessage").subscribe((message) => {
                console.log("AAAAAAAAAAAAAAAAAAAAA webRtcDisconnectMessage from ", message.sender.spaceUserId);
                const user: UserSimplePeerInterface = {
                    userId: message.sender.spaceUserId,
                };

                this.receiveWebrtcDisconnect(user);
            })
        );
    }

    private receiveWebrtcStart(user: UserSimplePeerInterface, spaceUserFromBack: SpaceUserExtended): void {
        // Note: the clients array contain the list of all clients (even the ones we are already connected to in case a user joins a group)
        // So we can receive a request we already had before. (which will abort at the first line of createPeerConnection)
        // This would be symmetrical to the way we handle disconnection.

        this.createPeerConnection(user, spaceUserFromBack, spaceUserFromBack.uuid).catch((e) => {
            console.error(`receiveWebrtcStart => ${user.userId}`, e);
            Sentry.captureException(e);
        });
    }

    private receiveWebrtcDisconnect(user: UserSimplePeerInterface): void {
        this.closeConnection(user.userId);
    }

    /**
     * create peer connection to bind users
     */
    private async createPeerConnection(
        user: UserSimplePeerInterface,
        spaceUser: SpaceUserExtended,
        uuid: string
    ): Promise<RemotePeer | null> {
        const peerConnection = this.videoPeers.get(user.userId);
        if (peerConnection) {
            if (peerConnection.destroyed) {
                this._streamableSubjects.videoPeerRemoved.next(peerConnection);
                peerConnection.destroy();

                //this.space.livekitVideoStreamStore.delete(user.userId);
            } else {
                return null;
            }
        }

        const name = spaceUser.name;
        console.log("AAAAAAAAAAAAAAA createPeerConnection before getting iceServersConfig with userId ", user.userId);
        const iceServers = await iceServersManager.getIceServersConfig();
        console.log("AAAAAAAAAAAAAAA createPeerConnection before after iceServersConfig with userId ", user.userId);
        if (this.abortController.signal.aborted) {
            return null;
        }

        const peer = new RemotePeer(
            user,
            user.initiator ? user.initiator : false,
            this._space,
            iceServers,
            false,
            this._localStreamStore,
            "video",
            spaceUser.spaceUserId,
            this._blockedUsersStore,
            () => {
                this.videoPeers.delete(user.userId);
            },
            apparentMediaContraintStore
        );

        // When a connection is established to a video stream, and if a screen sharing is taking place,
        // the user sharing screen should also initiate a connection to the remote user!

        // Event listener is valid for the lifetime of the object and will be garbage collected when the object is destroyed
        // eslint-disable-next-line listeners/no-missing-remove-event-listener, listeners/no-inline-function-event-listener
        peer.on("connect", () => {
            const streamResult = get(this._screenSharingLocalStreamStore);
            if (streamResult.type === "success" && streamResult.stream !== undefined) {
                this.sendLocalScreenSharingStreamToUser(user.userId, streamResult.stream);
            }

            // Now, in case a stream is generated from the scripting API, we need to send it to the new peer
            if (this.scriptingApiStream) {
                peer.dispatchStream(this.scriptingApiStream);
            }
        });

        //Create a notification for first user in circle discussion
        if (this.videoPeers.size === 0) {
            const notificationText = get(LL).notification.discussion({ name });
            this._notificationManager.createNotification(new BasicNotification(notificationText));
        }

        this._analyticsClient.addNewParticipant(peer.uniqueId, user.userId, uuid);

        // TODO: if iceServers are slow to answer, videoPeers is not set right away. We need to check that a WebRTC start cannot arrive BEFORE
        // Alternatively, videoPeers should contain Promises (which makes the whole code async....)
        this.videoPeers.set(user.userId, peer);

        if (!this.abortController.signal.aborted) {
            this._streamableSubjects.videoPeerAdded.next(peer);
        }
        return peer;
    }

    /**
     * create peer connection to bind users
     */
    private async createPeerScreenSharingConnection(
        user: UserSimplePeerInterface,
        spaceUserId: string,
        stream: MediaStream | undefined,
        isLocalPeer: boolean
    ): Promise<RemotePeer | null> {
        //const peerScreenSharingConnection = this.space.screenSharingPeerStore.get(user.userId);
        const peerScreenSharingConnection = this.screenSharePeers.get(user.userId);

        if (peerScreenSharingConnection) {
            if (peerScreenSharingConnection.destroyed) {
                this._streamableSubjects.screenSharingPeerRemoved.next(peerScreenSharingConnection);
                //peerScreenSharingConnection.toClose = true;
                //peerScreenSharingConnection.destroy();
                //this.space.screenSharingPeerStore.delete(user.userId);
            } else {
                return null;
            }
        }

        const iceServers = await iceServersManager.getIceServersConfig();
        if (this.abortController.signal.aborted) {
            return null;
        }

        const peer = new RemotePeer(
            user,
            user.initiator ? user.initiator : false,
            this._space,
            iceServers,
            isLocalPeer,
            this._screenSharingLocalStreamStore,
            "screenSharing",
            spaceUserId,
            this._blockedUsersStore,
            () => {
                this.screenSharePeers.delete(user.userId);
            },
            readable({
                audio: true,
                video: true,
            })
        );

        // Create subscription to statusStore to close connection when user stop sharing screen
        // Is automatically unsubscribed when peer is destroyed
        /*this._unsubscribers.push(
            peer.statusStore.subscribe((status) => {
                if (status === "closed") {
                    if (!stream) {
                        this.closeScreenSharingConnection(user.userId);
                    } else {
                        this.stopLocalScreenSharingStreamToUser(user.userId, stream);
                    }
                }
            })
        );*/

        // When a connection is established to a video stream, and if a screen sharing is taking place,
        //if (!user.initiator) {

        // eslint-disable-next-line listeners/no-missing-remove-event-listener, listeners/no-inline-function-event-listener
        peer.on("stream", (stream) => {
            if (!this.screenSharePeers.has(user.userId)) {
                this.screenSharePeers.set(user.userId, peer);
                return;
            }
        });

        this.screenSharePeers.set(user.userId, peer);

        if (!this.abortController.signal.aborted) {
            this._streamableSubjects.screenSharingPeerAdded.next(peer);
        }

        return peer;
    }

    public blockedFromRemotePlayer(userId: string) {
        this.closeConnection(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    public closeConnection(userId: string) {
        try {
            const peer = this.videoPeers.get(userId);
            if (!peer || !(peer instanceof RemotePeer)) {
                return;
            }

            this._streamableSubjects.videoPeerRemoved.next(peer);

            //create temp peer to close

            peer.destroy();

            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.

            this.closeScreenSharingConnection(userId);
        } catch (err) {
            console.error("An error occurred in closeConnection", err);
        }

        //if the user left the discussion, clear screen sharing.
        if (this.screenSharePeers.size === 0) {
            for (const userId of this.screenSharePeers.keys()) {
                this.closeScreenSharingConnection(userId);
            }
        }

        //this.space.livekitVideoStreamStore.delete(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeScreenSharingConnection(userId: string) {
        try {
            const peer = this.screenSharePeers.get(userId);
            if (!peer) {
                return;
            }

            this._streamableSubjects.screenSharingPeerRemoved.next(peer);
            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.

            peer.destroy();
        } catch (err) {
            console.error("An error occurred in closeScreenSharingConnection", err);
        }
    }

    public destroy() {
        for (const userId of this.videoPeers.keys()) {
            this.closeConnection(userId);
        }

        for (const userId of this.screenSharePeers.keys()) {
            this.closeScreenSharingConnection(userId);
        }

        for (const unsubscriber of this._unsubscribers) {
            unsubscriber();
        }
        for (const subscription of this._rxJsUnsubscribers) {
            subscription.unsubscribe();
        }
    }

    private receiveWebrtcSignal(signalData: SignalData, spaceUser: SpaceUserExtended) {
        try {
            const peer = this.videoPeers.get(spaceUser.spaceUserId);

            if (peer) {
                peer.signal(signalData);
            } else {
                // TODO: understand how this can fail (notably in SpeakerZone in Firefox E2E tests.
                console.error(
                    'Could not find peer whose ID is "' +
                        spaceUser.spaceUserId +
                        '" in videoPeers. WebRTC Signal cannot be forwarded.'
                );
                Sentry.captureException(
                    'Could not find peer whose ID is "' +
                        spaceUser.spaceUserId +
                        '" in videoPeers. WebRTC Signal cannot be forwarded.'
                );
            }
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${spaceUser.spaceUserId}`, e);
            Sentry.captureException(e);
        }
    }

    private async receiveWebrtcScreenSharingSignal(
        data: WebRtcSignalReceivedMessageInterface,
        spaceUser: SpaceUserExtended
    ) {
        const streamResult = get(this._screenSharingLocalStreamStore);
        let stream: MediaStream | undefined = undefined;
        if (streamResult && streamResult.type === "success" && streamResult.stream !== undefined) {
            stream = streamResult.stream;
        }

        try {
            //if offer type, create peer connection
            if (data.signal.type === "offer") {
                await this.createPeerScreenSharingConnection(data, spaceUser.spaceUserId, stream, false);
            }
            const peer = this.screenSharePeers.get(data.userId);
            if (peer !== undefined) {
                peer.signal(data.signal);
            } else {
                console.error(
                    'Could not find peer whose ID is "' + data.userId + '" in receiveWebrtcScreenSharingSignal'
                );
                this._customWebRTCLogger.info("Attempt to create new peer connection");
                if (stream) {
                    this.sendLocalScreenSharingStreamToUser(data.userId, stream);
                }
            }
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${data.userId}`, e);
            //Comment this peer connection because if we delete and try to reshare screen, the RTCPeerConnection send renegotiate event. This array will be removed when user left circle discussion
            await this.receiveWebrtcScreenSharingSignal(data, spaceUser);
        }
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public sendLocalScreenSharingStream(localScreenCapture: MediaStream) {
        for (const userId of this.videoPeers.keys()) {
            this.sendLocalScreenSharingStreamToUser(userId, localScreenCapture);
        }
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public stopLocalScreenSharingStream() {
        for (const userId of this.videoPeers.keys()) {
            this.stopLocalScreenSharingStreamToUser(userId);
        }
    }

    private sendLocalScreenSharingStreamToUser(userId: string, localScreenCapture: MediaStream): void {
        // If a connection already exists with user (because it is already sharing a screen with us... let's use this connection)

        if (this.screenSharePeers.has(userId)) {
            return;
        }

        const screenSharingUser: UserSimplePeerInterface = {
            userId,
            initiator: true,
        };

        this.createPeerScreenSharingConnection(
            screenSharingUser,
            this._space.mySpaceUserId,
            localScreenCapture,
            true
        ).catch((e) => {
            console.error(`sendLocalScreenSharingStreamToUser => ${userId}`, e);
            Sentry.captureException(e);
        });
    }

    private stopLocalScreenSharingStreamToUser(userId: string): void {
        const PeerConnectionScreenSharing = this.screenSharePeers.get(userId);
        if (!PeerConnectionScreenSharing) {
            return;
        }

        // Send message to stop screen sharing
        PeerConnectionScreenSharing.stopStreamToRemoteUser();

        // If there are no more screen sharing streams, let's close the connection
        if (!PeerConnectionScreenSharing.isReceivingScreenSharingStream()) {
            // Destroy the peer connection
            PeerConnectionScreenSharing.destroy();
            // Close the screen sharing connection
            this.closeScreenSharingConnection(userId);
        }
    }

    private scriptingApiStream: MediaStream | undefined = undefined;

    /**
     * Sends the stream passed in parameter to all the peers.
     * Used to send streams generated by the scripting API.
     */
    public dispatchStream(mediaStream: MediaStream) {
        for (const videoPeer of this.videoPeers.values()) {
            if (videoPeer.connected) {
                videoPeer.dispatchStream(mediaStream);
            }
        }
        this.scriptingApiStream = mediaStream;
    }

    public getVideoForUser(spaceUserId: string): Streamable | undefined {
        return this.videoPeers.get(spaceUserId);
    }

    public getScreenSharingForUser(spaceUserId: string): Streamable | undefined {
        return this.screenSharePeers.get(spaceUserId);
    }

    /**
     * Starts the shutdown process of the communication state. It does not remove all video peers immediately,
     * but any asynchronous operation receiving a new stream should be ignored after this call.
     */
    public shutdown(): void {
        this.abortController.abort();
    }
}
