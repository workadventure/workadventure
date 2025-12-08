import * as Sentry from "@sentry/svelte";
import { get, readable, Readable } from "svelte/store";
import { Subscription } from "rxjs";
import { SignalData } from "simple-peer";
import { asError } from "catch-unknown";
import { raceTimeout } from "../Utils/PromiseUtils";
import type { WebRtcSignalReceivedMessageInterface } from "../Connection/ConnexionModels";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { playersStore } from "../Stores/PlayersStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { notificationManager } from "../Notification/NotificationManager";
import { SimplePeerConnectionInterface, StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import { localStreamStore } from "../Stores/MediaStore";
import { apparentMediaContraintStore } from "../Stores/ApparentMediaContraintStore";
import { RetryWithBackoff } from "../Utils/RetryWithBackoff";
import { RemotePeer } from "./RemotePeer";
import { customWebRTCLogger } from "./CustomWebRTCLogger";
import { iceServersManager } from "./IceServersManager";

export interface UserSimplePeerInterface {
    userId: string;
    initiator?: boolean;
    connectionId?: string;
}

/**
 * This class manages connections to all the peers in the same group as me.
 *
 */
export class SimplePeer implements SimplePeerConnectionInterface {
    private readonly _unsubscribers: (() => void)[] = [];
    private readonly _rxJsUnsubscribers: Subscription[] = [];

    // A map of all screen sharing peers, indexed by spaceUserId
    private screenSharePeers: Map<
        string,
        {
            promise: Promise<RemotePeer>;
            // Note: the abort controller is used for both the regular shutdown of the screenSharePeer and for cleaning errors
            abortController: AbortController;
        }
    > = new Map();
    // A map of all video peers, indexed by spaceUserId
    private videoPeers: Map<
        string,
        {
            promise: Promise<RemotePeer>;
            // Note: the abort controller is used for the regular shutdown of the videoPeer and for cleaning errors
            abortController: AbortController;
        }
    > = new Map();
    private abortController = new AbortController();

    // Retry state management with exponential backoff
    private readonly retryManager: RetryWithBackoff;
    private readonly retryInitiatorMap: Map<string, boolean> = new Map();

    // Test mechanism for WebRTC reconnection
    private testTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
    private testDisconnectCounts: Map<string, number> = new Map(); // Track how many times we've disconnected each user for testing
    private readonly ENABLE_WEBRTC_TEST = true; // Set to true to enable test disconnection
    private readonly WEBRTC_TEST_DISCONNECT_DELAY = 5000; // Close connection after 5 seconds for testing
    private readonly WEBRTC_TEST_MAX_DISCONNECTS = 4; // After this many test disconnects, let the connection pass

    constructor(
        private _space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>,
        private _screenSharingLocalStreamStore = screenSharingLocalStreamStore,
        private _playersStore = playersStore,
        private _analyticsClient = analyticsClient,
        private _notificationManager = notificationManager,
        private _customWebRTCLogger = customWebRTCLogger,
        private _localStreamStore = localStreamStore
    ) {
        // Initialize retry manager with 30 attempts, backoff up to 15 seconds
        this.retryManager = new RetryWithBackoff({
            // maxAttempts: 30,
            maxAttempts: 5,
            initialDelayMs: 500,
            maxDelayMs: 15000,
            backoffMultiplier: 1.2,
            onMaxRetriesReached: () => {
                //TODO: changer un status pour afficher un msg d'info
                //TODO : voir si on identifie la personne qui a un probleme par rapport au nombre de personne ...
                console.log("[RETRY] Maximum retry attempts (30) reached for a connection");
            },
        });

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
                const webRtcSignalToClientMessage = message.webRtcSignal;

                this.receiveWebrtcSignal(JSON.parse(webRtcSignalToClientMessage.signal) as SignalData, message.sender, webRtcSignalToClientMessage.connectionId);
            })
        );

        //receive signal by gemer
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcScreenSharingSignal").subscribe((message) => {
                const webRtcScreenSharingSignalToClientMessage = message.webRtcScreenSharingSignal;

                const webRtcSignalReceivedMessage: WebRtcSignalReceivedMessageInterface = {
                    userId: message.sender.spaceUserId,
                    signal: JSON.parse(webRtcScreenSharingSignalToClientMessage.signal),
                };

                this.receiveWebrtcScreenSharingSignal(webRtcSignalReceivedMessage, message.sender, webRtcScreenSharingSignalToClientMessage.connectionId).catch((e) => {
                    console.error(`receiveWebrtcScreenSharingSignal => ${webRtcSignalReceivedMessage.userId}`, e);
                    Sentry.captureException(e);
                });
            })
        );


        //receive message start
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcStartMessage").subscribe((message) => {
                const webRtcStartMessage = message.webRtcStartMessage;

                if (!webRtcStartMessage.connectionId) {
                    const error = new Error(`Missing connectionId in webRtcStartMessage for user ${message.sender.spaceUserId}`);
                    console.error(error);
                    Sentry.captureException(error);
                    return;
                }

                const user: UserSimplePeerInterface = {
                    userId: message.sender.spaceUserId,
                    initiator: webRtcStartMessage.initiator,
                };
                console.log("🥳🥳🥳🥳 receiveWebrtcStart : connectionId", webRtcStartMessage.connectionId);
                this.receiveWebrtcStart(user, message.sender, webRtcStartMessage.connectionId);
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

    private receiveWebrtcStart(user: UserSimplePeerInterface, spaceUserFromBack: SpaceUserExtended, connectionId: string): void {
        // Note: the clients array contain the list of all clients (even the ones we are already connected to in case a user joins a group)
        // So we can receive a request we already had before. (which will abort at the first line of createPeerConnection)
        // This would be symmetrical to the way we handle disconnection.
        console.log("receiveWebrtcStart : create peer connection for user", user.userId);
        this.createPeerConnection(user, spaceUserFromBack, spaceUserFromBack.uuid, connectionId).catch((e) => {
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
        uuid: string,
        connectionId: string
    ): Promise<RemotePeer | null> {
        const peerConnection = this.videoPeers.get(user.userId);
        if (peerConnection) {
            const peerConnectionValue = await peerConnection.promise;
            if (peerConnectionValue.destroyed) {
                this._streamableSubjects.videoPeerRemoved.next(peerConnectionValue);
                peerConnectionValue.destroy();

                //this.space.livekitVideoStreamStore.delete(user.userId);
            } else if (peerConnection.abortController.signal.aborted) {
                // The previous connection was aborted, we can safely create a new one.
            } else if (peerConnectionValue.connectionId !== connectionId) {
                // The connectionId has changed (e.g., due to a reconnection attempt).
                // We need to destroy the old peer and create a new one with the new connectionId.
                peerConnection.abortController.abort();
            } else {
                return peerConnectionValue;
            }
        }

        const abortController = new AbortController();

        const peerPromise = new Promise<RemotePeer>((resolve, reject) => {
            (async () => {
                const iceServers = await iceServersManager.getIceServersConfig();
                if (this.abortController.signal.aborted) {
                    reject(asError(this.abortController.signal.reason));
                    return;
                }
                if (abortController.signal.aborted) {
                    reject(asError(abortController.signal.reason));
                    return;
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
                        abortController.abort();
                        this.handleConnectionFailure(user.userId, user.initiator ?? false, spaceUser);
                    },
                    apparentMediaContraintStore,
                    connectionId
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

                    // Connection successful, clear retry state
                    //this.clearRetryState(user.userId);

                    // Test mechanism: close connection after delay if enabled and user is initiator
                    if (this.ENABLE_WEBRTC_TEST && user.initiator) {
                        const currentDisconnectCount = this.testDisconnectCounts.get(user.userId) ?? 0;

                        // Only disconnect if we haven't reached the max test disconnects
                        if (currentDisconnectCount < this.WEBRTC_TEST_MAX_DISCONNECTS) {
                            const testTimeout = setTimeout(() => {
                                if (!peer.destroyed && peer.connected) {
                                    const newCount = currentDisconnectCount + 1;
                                    this.testDisconnectCounts.set(user.userId, newCount);

                                    console.log(
                                        `[TEST] Closing peer connection for user ${user.userId} to test retry mechanism (disconnect ${newCount}/${this.WEBRTC_TEST_MAX_DISCONNECTS})`
                                    );
                                    // Pass intentional=false to allow retry mechanism to work
                                    peer._statusStore.set("connecting");
                                    this.closeConnection(user.userId, false);
                                }
                            }, this.WEBRTC_TEST_DISCONNECT_DELAY);

                            this.testTimeouts.set(user.userId, testTimeout);

                            // Clear timeout if peer is destroyed before timeout
                            peer.once("close", () => {
                                const timeout = this.testTimeouts.get(user.userId);
                                if (timeout) {
                                    clearTimeout(timeout);
                                    this.testTimeouts.delete(user.userId);
                                }
                            });
                        } else {
                            console.log(
                                `[TEST] Connection for user ${user.userId} passed after ${currentDisconnectCount} test disconnects - connection is now stable`
                            );
                            this.clearRetryState(user.userId);
                        }
                    }
                });

                this._analyticsClient.addNewParticipant(peer.uniqueId, user.userId, uuid);

                resolve(peer);
            })().catch((e) => {
                reject(asError(e));
            });
        });

        const peerObj: { promise: Promise<RemotePeer>; abortController: AbortController } = {
            promise: peerPromise,
            abortController: abortController,
        };

        this.videoPeers.set(user.userId, peerObj);

        const onAbort = () => {
            console.log("🚫🚫🚫🚫 onAbort", user.userId);
            this.videoPeers.delete(user.userId);
        };
        
        abortController.signal.addEventListener("abort", onAbort, { once: true });
        
        let peer: RemotePeer;
        try {
            peer = await peerPromise;
        } catch (e) {
            abortController.abort(e);
            throw e;
        }
        if (peer === null) {
            abortController.abort();
            return null;
        }
        
        if (!this.abortController.signal.aborted) {
            console.log("✅✅✅✅ videoPeerAdded", user.userId);
            this._streamableSubjects.videoPeerAdded.next(peer);
            
            const onAbort2 = () => {
                this._streamableSubjects.videoPeerRemoved.next(peer);
                peer._statusStore.set("connecting");
                peer.destroy();
            };

            abortController.signal.addEventListener("abort", onAbort2, { once: true });
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
        isLocalPeer: boolean,
        connectionId: string
    ): Promise<RemotePeer | null> {
        //const peerScreenSharingConnection = this.space.screenSharingPeerStore.get(user.userId);
        const peerScreenSharingConnection = this.screenSharePeers.get(user.userId);
        if (peerScreenSharingConnection) {
            const peerScreenSharingConnectionValue = await peerScreenSharingConnection.promise;
            if (peerScreenSharingConnectionValue.destroyed) {
                this._streamableSubjects.screenSharingPeerRemoved.next(peerScreenSharingConnectionValue);
                //peerScreenSharingConnection.toClose = true;
                //peerScreenSharingConnection.destroy();
                //this.space.screenSharingPeerStore.delete(user.userId);
            } else if (peerScreenSharingConnection.abortController.signal.aborted) {
                // The previous connection was aborted, we can safely create a new one.
            } else {
                return null;
            }
        }

        const abortController = new AbortController();

        const peerPromise = new Promise<RemotePeer>((resolve, reject) => {
            (async () => {
                const iceServers = await iceServersManager.getIceServersConfig();
                if (this.abortController.signal.aborted) {
                    reject(asError(this.abortController.signal.reason));
                    return;
                }
                if (abortController.signal.aborted) {
                    reject(asError(abortController.signal.reason));
                    return;
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
                        abortController.abort();
                        this._streamableSubjects.screenSharingPeerRemoved.next(peer);
                    },
                    readable({
                        audio: true,
                        video: true,
                    }),
                    connectionId
                );

                resolve(peer);
            })().catch((e) => {
                reject(asError(e));
            });
        });

        const peerObj: { promise: Promise<RemotePeer>; abortController: AbortController } = {
            promise: peerPromise,
            abortController: abortController,
        };

        this.screenSharePeers.set(user.userId, peerObj);

        const onAbort = () => {
            this.screenSharePeers.delete(user.userId);
        };

        abortController.signal.addEventListener("abort", onAbort, { once: true });

        let peer: RemotePeer;
        try {
            peer = await peerPromise;
        } catch (e) {
            abortController.abort(e);
            throw e;
        }
        if (peer === null) {
            abortController.abort();
            return null;
        }

        if (!this.abortController.signal.aborted) {
            this._streamableSubjects.screenSharingPeerAdded.next(peer);

            const onAbort2 = () => {
                this._streamableSubjects.screenSharingPeerRemoved.next(peer);
                peer.destroy();
            };

            abortController.signal.addEventListener("abort", onAbort2, { once: true });
        }

        return peer;
    }

    public blockedFromRemotePlayer(userId: string) {
        this.closeConnection(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     * @param userId - The user ID to close connection with
     * @param intentional - If true, clears retry state (intentional disconnect). If false, allows retry mechanism to work.
     */
    public closeConnection(userId: string, intentional: boolean = true) {
        try {
            const peer = this.videoPeers.get(userId);
            if (!peer) {
                return;
            }

            peer.abortController.abort();

            // Only clear retry state if this is an intentional close (user left, manual close, etc.)
            // If unintentional (error, test), let the retry mechanism handle it
            if (intentional) {
                this.retryManager.cancel(userId);
                this.retryInitiatorMap.delete(userId);
                this.testDisconnectCounts.delete(userId); // Reset test disconnect counter on intentional close
            }

            // Always clear test timeout
            const testTimeout = this.testTimeouts.get(userId);
            if (testTimeout) {
                clearTimeout(testTimeout);
                this.testTimeouts.delete(userId);
            }

            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.

            this.closeScreenSharingConnection(userId);
        } catch (err) {
            console.error("An error occurred in closeConnection", err);
        }
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

            peer.abortController.abort();
        } catch (err) {
            console.error("An error occurred in closeScreenSharingConnection", err);
        }
    }

    /**
     * Emits an event when failed connections change
     */
    private emitFailedConnectionEvent(type: "add" | "remove", userId: string): void {
        this._streamableSubjects.failedConnectionsChanged.next({ type, userId });
    }

    /**
     * Emits an event when a connection enters or exits reconnecting state (loading)
     */
    private emitReconnectingConnectionEvent(type: "add" | "remove", userId: string): void {
        this._streamableSubjects.reconnectingConnectionsChanged.next({ type, userId });
    }

    /**
     * Handles connection failure and implements retry logic with exponential backoff
     * - 30 max attempts
     * - Delay increases up to 15 seconds
     * - Callback triggered after 30th failed attempt
     */
    private handleConnectionFailure(userId: string, isInitiator: boolean, spaceUser: SpaceUserExtended): void {
        
        // Get fresh spaceUser to ensure we have the latest data
        const currentSpaceUser = this._space.getSpaceUserBySpaceUserId(userId);
        if (!currentSpaceUser) {
            console.log(`[RETRY] User ${userId} left space, clearing retry state`);
            this.retryManager.cancel(userId);
            this.retryInitiatorMap.delete(userId);
            this.emitReconnectingConnectionEvent("remove", userId);
            return;
        }

        // Store initiator status for this user
        this.retryInitiatorMap.set(userId, isInitiator);

        const currentAttempt = this.retryManager.getAttemptCount(userId);
        const maxAttempts = this.retryManager.getMaxAttempts();
        const nextDelay = this.retryManager.calculateDelay(currentAttempt);

        console.log(
            `[RETRY] WebRTC connection failed for user ${userId}, scheduling retry attempt ${currentAttempt + 1}/${maxAttempts} in ${nextDelay}ms`
        );

        const retryScheduled = this.retryManager.scheduleRetry(userId, () => {
            // Double-check user is still in space before retrying
            const spaceUserForRetry = this._space.getSpaceUserBySpaceUserId(userId);
            if (spaceUserForRetry) {
                this.attemptRetry(userId, spaceUserForRetry, isInitiator);
            } else {
                console.log(`[RETRY] User ${userId} left space during retry delay, clearing retry state`);
                this.retryManager.cancel(userId);
                this.retryInitiatorMap.delete(userId);
                this.emitReconnectingConnectionEvent("remove", userId);
            }
        });

        if (retryScheduled) {
            // Retry scheduled - emit reconnecting event to show loading state in UI
            this.emitReconnectingConnectionEvent("add", userId);
        } else {
            // Max retries reached - exit reconnecting state and enter failed state
            this.emitReconnectingConnectionEvent("remove", userId);
            console.log(`[RETRY] WebRTC connection failed for user ${userId} after ${maxAttempts} attempts - stopping retries`);
            this.emitFailedConnectionEvent("add", userId);
        }
    }

    /**
     * Attempts to retry a connection by sending a meetingConnectionRestartMessage to the backend
     * The backend will respond with a new webRtcStartMessage containing a new connectionId
     */
    private attemptRetry(userId: string, spaceUser: SpaceUserExtended, isInitiator: boolean): void {
        if (this.abortController.signal.aborted) {
            return;
        }

        // Get fresh spaceUser to ensure we have the latest data
        const currentSpaceUser = this._space.getSpaceUserBySpaceUserId(userId);
        if (!currentSpaceUser) {
            console.warn(`Cannot retry connection for user ${userId}: user not found in space`);
            return;
        }

        // Only the initiator should send the restart message to avoid duplicate messages
        if (!isInitiator) {
            console.log(`[RETRY] Not initiator for user ${userId}, waiting for initiator to restart connection`);
            return;
        }

        const currentAttempt = this.retryManager.getAttemptCount(userId);
        const maxAttempts = this.retryManager.getMaxAttempts();

        console.log(`[RETRY] Attempting to reconnect to user ${userId} (attempt ${currentAttempt}/${maxAttempts})`);

        // Send restart message to backend, which will respond with a new webRtcStartMessage
        console.log(`[RETRY] Sending meetingConnectionRestartMessage for user ${userId}`);
        this._space.emitBackEvent({
            event: {
                $case: "meetingConnectionRestartMessage",
                meetingConnectionRestartMessage: {
                    userId: userId,
                },
            },
        });
    }

    /**
     * Clears retry state for a user (on successful connection or user leaving)
     */
    private clearRetryState(userId: string): void {
        const wasFailed = this.retryManager.hasReachedMaxRetries(userId);
        const wasReconnecting = this.retryManager.hasPendingRetry(userId) || this.retryManager.getAttemptCount(userId) > 0;

        this.retryManager.resetAttempts(userId);
        this.retryInitiatorMap.delete(userId);
        this.testDisconnectCounts.delete(userId);

        // Exit reconnecting state if was reconnecting
        if (wasReconnecting) {
            this.emitReconnectingConnectionEvent("remove", userId);
        }

        // Exit failed state if was failed
        if (wasFailed) {
            this.emitFailedConnectionEvent("remove", userId);
        }

        const testTimeout = this.testTimeouts.get(userId);
        if (testTimeout) {
            clearTimeout(testTimeout);
            this.testTimeouts.delete(userId);
        }
    }

    public destroy() {
        // Clear all retry state
        this.retryManager.cancelAll();
        this.retryInitiatorMap.clear();

        // Clear all test timeouts and counters
        for (const timeout of this.testTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.testTimeouts.clear();
        this.testDisconnectCounts.clear();

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

    private receiveWebrtcSignal(signalData: SignalData, spaceUser: SpaceUserExtended, connectionId: string) {
        (async () => {
            const peerObj = this.videoPeers.get(spaceUser.spaceUserId);

            if (peerObj) {
                const peer = await raceTimeout(peerObj.promise, 20_000);
                if (peerObj.abortController.signal.aborted) {
                    return;
                }
                if (peer.connectionId !== connectionId) {
                    const error = new Error(
                        `receiveWebrtcSignal => ${spaceUser.spaceUserId} connectionId mismatch: expected ${connectionId}, got ${peer.connectionId}`
                    );
                    console.error(error);
                    Sentry.captureException(error);
                    return;
                }
                console.log(`receiveWebrtcSignal => ${spaceUser.spaceUserId} connectionId matched: expected ${connectionId}, got ${peer.connectionId}`);
                peer.signal(signalData);
            } else {
                // TODO: understand how this can fail (notably in SpeakerZone in Firefox E2E tests.
                console.error(
                    'Could not find peer whose ID is "' +
                        spaceUser.spaceUserId +
                        '" in videoPeers. WebRTC Signal cannot be forwarded.'
                );
                Sentry.captureException(
                    new Error(
                        'Could not find peer whose ID is "' +
                            spaceUser.spaceUserId +
                            '" in videoPeers. WebRTC Signal cannot be forwarded.'
                    )
                );
            }
        })().catch((e) => {
            console.error(`receiveWebrtcSignal => ${spaceUser.spaceUserId}`, e);
            Sentry.captureException(e);
        });
    }

    private async receiveWebrtcScreenSharingSignal(
        data: WebRtcSignalReceivedMessageInterface,
        spaceUser: SpaceUserExtended,
        connectionId: string
    ) {
        const streamResult = get(this._screenSharingLocalStreamStore);
        let stream: MediaStream | undefined = undefined;
        if (streamResult && streamResult.type === "success" && streamResult.stream !== undefined) {
            stream = streamResult.stream;
        }
        try {
            //if offer type, create peer connection
            if (data.signal.type === "offer") {
                await this.createPeerScreenSharingConnection(data, spaceUser.spaceUserId, stream, false, connectionId);
            }
            const peerObj = this.screenSharePeers.get(data.userId);
            if (peerObj !== undefined) {
                const peer = await raceTimeout(peerObj.promise, 20_000);
                if (peerObj.abortController.signal.aborted) {
                    return;
                }
                if (peer.connectionId !== connectionId) {
                    const error = new Error(
                        `receiveWebrtcScreenSharingSignal => ${data.userId} connectionId mismatch: expected ${connectionId}, got ${peer.connectionId}`
                    );
                    console.error(error);
                    Sentry.captureException(error);
                    return;
                }
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
            console.error(`receiveWebrtcScreenSharingSignal => ${data.userId}`, e);
            Sentry.captureException(e);
            //Comment this peer connection because if we delete and try to reshare screen, the RTCPeerConnection send renegotiate event. This array will be removed when user left circle discussion
            //await this.receiveWebrtcScreenSharingSignal(data, spaceUser);
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

        // Get connectionId from the video peer connection (screen sharing uses the same connectionId)
        const videoPeerObj = this.videoPeers.get(userId);
        if (!videoPeerObj) {
            console.error(`Cannot start screen sharing for user ${userId}: no video peer connection found`);
            return;
        }

        videoPeerObj.promise
            .then((videoPeer) => {
                const screenSharingUser: UserSimplePeerInterface = {
                    userId,
                    initiator: true,
                    connectionId: videoPeer.connectionId,
                };
                return this.createPeerScreenSharingConnection(
                    screenSharingUser,
                    userId,
                    localScreenCapture,
                    true,
                    videoPeer.connectionId
                );
            })
            .catch((e) => {
                console.error(`sendLocalScreenSharingStreamToUser => ${userId}`, e);
                Sentry.captureException(e);
            });
    }

    private stopLocalScreenSharingStreamToUser(userId: string): void {
        const peerConnectionScreenSharingObj = this.screenSharePeers.get(userId);
        if (!peerConnectionScreenSharingObj) {
            return;
        }

        (async () => {
            const peerConnectionScreenSharing = await raceTimeout(peerConnectionScreenSharingObj.promise, 20_000);
            if (peerConnectionScreenSharingObj.abortController.signal.aborted) {
                return;
            }
            // Send message to stop screen sharing
            peerConnectionScreenSharing.stopStreamToRemoteUser();

            // If there are no more screen sharing streams, let's close the connection
            if (!peerConnectionScreenSharing.isReceivingScreenSharingStream()) {
                // Destroy the peer connection
                peerConnectionScreenSharing.destroy();
                // Close the screen sharing connection
                this.closeScreenSharingConnection(userId);
            }
        })().catch((e) => {
            console.error(`stopLocalScreenSharingStreamToUser => ${userId}`, e);
            Sentry.captureException(e);
        });
    }

    private scriptingApiStream: MediaStream | undefined = undefined;

    /**
     * Sends the stream passed in parameter to all the peers.
     * Used to send streams generated by the scripting API.
     */
    public dispatchStream(mediaStream: MediaStream) {
        for (const videoPeer of this.videoPeers.values()) {
            raceTimeout(videoPeer.promise, 20_000)
                .then((peer) => {
                    if (videoPeer.abortController.signal.aborted || this.abortController.signal.aborted) {
                        return;
                    }
                    if (peer.connected) {
                        peer.dispatchStream(mediaStream);
                    }
                })
                .catch((e) => {
                    console.error("An error occurred while waiting for a peer to be ready in dispatchStream", e);
                    Sentry.captureException(e);
                });
        }
        this.scriptingApiStream = mediaStream;
    }

    /**
     * Starts the shutdown process of the communication state. It does not remove all video peers immediately,
     * but any asynchronous operation receiving a new stream should be ignored after this call.
     */
    public shutdown(): void {
        this.abortController.abort();
    }

    /**
     * Retries a failed connection for a specific user (manual retry)
     * Resets the retry counter to allow fresh 30 attempts
     */
    public retryConnection(userId: string): void {
        if (this.abortController.signal.aborted) {
            return;
        }

        const spaceUser = this._space.getSpaceUserBySpaceUserId(userId);
        if (!spaceUser) {
            console.warn(`Cannot retry connection for user ${userId}: user not found in space`);
            return;
        }

        console.log(`[RETRY] Manual retry requested for user ${userId}`);

        // Reset retry state to allow new attempts
        this.retryManager.resetAttempts(userId);
        this.retryInitiatorMap.delete(userId);
        this.testDisconnectCounts.delete(userId); // Reset test disconnect counter on manual retry

        // Close existing connection if any (intentional close, so clear retry state)
        this.closeConnection(userId, true);

        // Send restart message to backend to initiate reconnection
        // The backend will send webRtcStartMessage which will trigger createPeerConnection
        console.log("[RETRY] Manual retryConnection => meetingConnectionRestartMessage", userId);
        this._space.emitBackEvent({
            event: {
                $case: "meetingConnectionRestartMessage",
                meetingConnectionRestartMessage: {
                    userId: userId,
                },
            },
        });
    }

    /**
     * Retries all failed connections
     */
    public retryAllFailedConnections(): void {
        const failedUserIds = Array.from(this.retryManager.getFailedIdentifiers());
        console.log(`Retrying ${failedUserIds.length} failed connections`);

        for (const userId of failedUserIds) {
            this.retryConnection(userId);
        }
    }

    /**
     * Checks if a connection has failed (reached retry limit of 30 attempts)
     */
    public isConnectionFailed(userId: string): boolean {
        return this.retryManager.hasReachedMaxRetries(userId);
    }

    /**
     * Gets the set of all failed connection user IDs
     */
    public getFailedConnections(): ReadonlySet<string> {
        return this.retryManager.getFailedIdentifiers();
    }
}
