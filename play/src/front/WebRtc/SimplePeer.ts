import * as Sentry from "@sentry/svelte";
import type { Readable } from "svelte/store";
import { get, readable } from "svelte/store";
import type { Subscription } from "rxjs";
import type { SignalData } from "simple-peer";
import { asError } from "catch-unknown";
import { raceTimeout } from "../Utils/PromiseUtils";
import type { WebRtcSignalReceivedMessageInterface } from "../Connection/ConnexionModels";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import type { SimplePeerConnectionInterface, StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import type { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import { localStreamStore } from "../Stores/MediaStore";
import { apparentMediaContraintStore } from "../Stores/ApparentMediaContraintStore";
import { RetryWithBackoff } from "../Utils/RetryWithBackoff";
import { warningMessageStore } from "../Stores/ErrorStore";
import LL from "../../i18n/i18n-svelte";
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

    // Delayed reset for attempt counter - keeps history if connection is unstable
    private readonly attemptResetTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
    private readonly ATTEMPT_RESET_DELAY_MS = 60_000; // Wait 60 seconds of stable connection before resetting attempts

    // Persistent issue tracking - show warning after this many attempts
    private readonly PERSISTENT_ISSUE_THRESHOLD = 10;
    private readonly persistentIssueUsers: Set<string> = new Set();

    constructor(
        private _space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>,
        private _screenSharingLocalStreamStore = screenSharingLocalStreamStore,
        private _analyticsClient = analyticsClient,
        private _customWebRTCLogger = customWebRTCLogger,
        private _localStreamStore = localStreamStore
    ) {
        // Initialize retry manager with 30 attempts, backoff up to 15 seconds
        this.retryManager = new RetryWithBackoff({
            maxAttempts: 30,
            initialDelayMs: 500,
            maxDelayMs: 15000,
            backoffMultiplier: 1.2,
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

                if (!webRtcSignalToClientMessage.connectionId) {
                    const error = new Error(
                        `Missing connectionId in webRtcSignal for user ${message.sender.spaceUserId}`
                    );
                    console.error(error);
                    Sentry.captureException(error);
                    return;
                }

                this.receiveWebrtcSignal(
                    JSON.parse(webRtcSignalToClientMessage.signal) as SignalData,
                    message.sender,
                    webRtcSignalToClientMessage.connectionId
                );
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

                this.receiveWebrtcScreenSharingSignal(
                    webRtcSignalReceivedMessage,
                    message.sender,
                    webRtcScreenSharingSignalToClientMessage.connectionId
                ).catch((e) => {
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
                    const error = new Error(
                        `Missing connectionId in webRtcStartMessage for user ${message.sender.spaceUserId}`
                    );
                    console.error(error);
                    Sentry.captureException(error);
                    return;
                }

                const user: UserSimplePeerInterface = {
                    userId: message.sender.spaceUserId,
                    initiator: webRtcStartMessage.initiator,
                };
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

    private receiveWebrtcStart(
        user: UserSimplePeerInterface,
        spaceUserFromBack: SpaceUserExtended,
        connectionId: string
    ): void {
        // Note: the clients array contain the list of all clients (even the ones we are already connected to in case a user joins a group)
        // So we can receive a request we already had before. (which will abort at the first line of createPeerConnection)
        // This would be symmetrical to the way we handle disconnection.
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
                    (intentionalClose: boolean) => {
                        abortController.abort();
                        if (!intentionalClose) {
                            this.handleConnectionFailure(user.userId, user.initiator ?? false, spaceUser);
                        }
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
                    this.clearRetryState(user.userId);
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
            this._streamableSubjects.videoPeerAdded.next(peer);

            const onAbort2 = () => {
                this._streamableSubjects.videoPeerRemoved.next(peer);
                // Check if this is an intentional close by examining the abort reason
                if (abortController.signal.reason === "intentional") {
                    peer.markAsIntentionalClose();
                }
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
                    (_intentionalClose: boolean) => {
                        abortController.abort();
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
                // Check if this is an intentional close by examining the abort reason
                if (abortController.signal.reason === "intentional") {
                    peer.markAsIntentionalClose();
                }
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

            // Pass "intentional" as abort reason to signal this is not an error-based closure
            peer.abortController.abort(intentional ? "intentional" : undefined);

            // Only clear retry state if this is an intentional close (user left, manual close, etc.)
            // If unintentional (error), let the retry mechanism handle it
            if (intentional) {
                this.retryManager.cancel(userId);
                this.retryInitiatorMap.delete(userId);
                this.cancelDelayedAttemptReset(userId); // Cancel any pending delayed reset
            }

            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.

            this.closeScreenSharingConnection(userId, intentional);
        } catch (err) {
            console.error("An error occurred in closeConnection", err);
        }
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeScreenSharingConnection(userId: string, intentional: boolean = true) {
        try {
            const peer = this.screenSharePeers.get(userId);
            if (!peer) {
                return;
            }

            // Pass "intentional" as abort reason to signal this is not an error-based closure
            peer.abortController.abort(intentional ? "intentional" : undefined);
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
     * Emits an event when a connection has a persistent issue (exceeded threshold attempts)
     */
    private emitPersistentIssueConnectionEvent(type: "add" | "remove", userId: string): void {
        this._streamableSubjects.persistentIssueConnectionsChanged.next({ type, userId });
    }

    /**
     * Handles connection failure and implements retry logic with exponential backoff
     * - 30 max attempts
     * - Delay increases up to 15 seconds
     * - Callback triggered after 30th failed attempt
     */
    private handleConnectionFailure(userId: string, isInitiator: boolean, spaceUser: SpaceUserExtended): void {
        // Don't handle failures if shutdown has been called
        if (this.abortController.signal.aborted) {
            return;
        }
        // Cancel any pending delayed attempt reset - we want to keep the history
        this.cancelDelayedAttemptReset(userId);

        // Get fresh spaceUser to ensure we have the latest data
        const currentSpaceUser = this._space.getSpaceUserBySpaceUserId(userId);
        if (!currentSpaceUser) {
            this.retryManager.cancel(userId);
            this.retryInitiatorMap.delete(userId);
            this.emitReconnectingConnectionEvent("remove", userId);
            return;
        }

        // Store initiator status for this user
        this.retryInitiatorMap.set(userId, isInitiator);

        const retryScheduled = this.retryManager.scheduleRetry(userId, () => {
            // Double-check user is still in space before retrying
            const spaceUserForRetry = this._space.getSpaceUserBySpaceUserId(userId);
            if (spaceUserForRetry) {
                this.attemptRetry(userId, isInitiator);
            } else {
                this.retryManager.cancel(userId);
                this.retryInitiatorMap.delete(userId);
                this.emitReconnectingConnectionEvent("remove", userId);
            }
        });

        if (retryScheduled) {
            // Retry scheduled - emit reconnecting event to show loading state in UI
            this.emitReconnectingConnectionEvent("add", userId);

            // Check if we've reached the persistent issue threshold
            const attemptAfterSchedule = this.retryManager.getAttemptCount(userId);
            if (attemptAfterSchedule >= this.PERSISTENT_ISSUE_THRESHOLD && !this.persistentIssueUsers.has(userId)) {
                this.persistentIssueUsers.add(userId);
                this.emitPersistentIssueConnectionEvent("add", userId);
            }
        } else {
            // Max retries reached - exit reconnecting state and enter failed state
            this.emitReconnectingConnectionEvent("remove", userId);
            this.emitFailedConnectionEvent("add", userId);
        }
    }

    /**
     * Attempts to retry a connection by sending a meetingConnectionRestartMessage to the backend
     * The backend will respond with a new webRtcStartMessage containing a new connectionId
     */
    private attemptRetry(userId: string, isInitiator: boolean): void {
        if (this.abortController.signal.aborted) {
            return;
        }

        // Only the initiator should send the restart message to avoid duplicate messages
        if (!isInitiator) {
            return;
        }

        // Track retry attempt in analytics
        this._analyticsClient.retryConnectionWebRtc();

        // Send restart message to backend, which will respond with a new webRtcStartMessage
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
     *
     * The attempt counter reset is delayed to track unstable connections.
     * If the connection fails again within ATTEMPT_RESET_DELAY_MS, we keep the history.
     */
    private clearRetryState(userId: string): void {
        const wasFailed = this.retryManager.hasReachedMaxRetries(userId);
        const wasReconnecting =
            this.retryManager.hasPendingRetry(userId) || this.retryManager.getAttemptCount(userId) > 0;

        // Cancel only the pending retry timeout, but preserve the attempt count
        // The attempt count will be reset later by scheduleDelayedAttemptReset
        this.retryManager.cancelTimeoutOnly(userId);
        this.retryInitiatorMap.delete(userId);

        // Exit reconnecting state if was reconnecting
        if (wasReconnecting) {
            this.emitReconnectingConnectionEvent("remove", userId);
        }

        // Exit failed state if was failed
        if (wasFailed) {
            this.emitFailedConnectionEvent("remove", userId);
        }

        // Exit persistent issue state if was in persistent issue
        if (this.persistentIssueUsers.has(userId)) {
            this.persistentIssueUsers.delete(userId);
            this.emitPersistentIssueConnectionEvent("remove", userId);
        }

        // Schedule delayed reset of attempt counter
        // This allows tracking unstable connections that fail frequently
        this.scheduleDelayedAttemptReset(userId);
    }

    /**
     * Schedules a delayed reset of the attempt counter.
     * If the connection remains stable for ATTEMPT_RESET_DELAY_MS, the counter is reset.
     * If a new failure occurs before that, the counter is preserved.
     */
    private scheduleDelayedAttemptReset(userId: string): void {
        // Clear any existing delayed reset for this user
        this.cancelDelayedAttemptReset(userId);

        const timeout = setTimeout(() => {
            this.attemptResetTimeouts.delete(userId);
            this.retryManager.resetAttempts(userId);
        }, this.ATTEMPT_RESET_DELAY_MS);

        this.attemptResetTimeouts.set(userId, timeout);
    }

    /**
     * Cancels a pending delayed attempt reset (called when connection fails again)
     */
    private cancelDelayedAttemptReset(userId: string): void {
        const existingTimeout = this.attemptResetTimeouts.get(userId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            this.attemptResetTimeouts.delete(userId);
        }
    }

    public destroy() {
        // Clear all retry state
        this.retryManager.cancelAll();
        this.retryInitiatorMap.clear();

        // Clear all delayed attempt reset timeouts
        for (const timeout of this.attemptResetTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.attemptResetTimeouts.clear();

        // Clear persistent issue state
        this.persistentIssueUsers.clear();

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
            this.notifyScreenSharingError();
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
                this.notifyScreenSharingError();
            });
    }

    /**
     * Displays a warning message to the user when screen sharing fails to start.
     */
    private notifyScreenSharingError(): void {
        warningMessageStore.addWarningMessage(get(LL).notification.screenSharingError());
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
     *
     * This method clears all retry-related state to ensure clean state when switching communication strategies.
     */
    public shutdown(): void {
        this.abortController.abort();

        // Cancel all pending retries to prevent new reconnecting events after shutdown
        this.retryManager.cancelAll();
        this.retryInitiatorMap.clear();

        // Clear all delayed attempt reset timeouts
        for (const timeout of this.attemptResetTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.attemptResetTimeouts.clear();

        // Clear persistent issue state to ensure clean state during strategy switch
        this.persistentIssueUsers.clear();
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

        // Reset retry state to allow new attempts
        this.retryManager.resetAttempts(userId);
        this.retryInitiatorMap.delete(userId);
        this.cancelDelayedAttemptReset(userId); // Cancel any pending delayed reset

        // Close existing connection if any (intentional close, so clear retry state)
        this.closeConnection(userId, true);

        // Track manual retry attempt in analytics
        this._analyticsClient.retryConnectionWebRtc();

        // Send restart message to backend to initiate reconnection
        // The backend will send webRtcStartMessage which will trigger createPeerConnection
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

    /**
     * [DEBUG] Forces a connection failure on the first video peer to test retry mechanism.
     * This method is for development/testing purposes only.
     * @returns Information about the triggered failure, or null if no peers exist
     */
    public forceFirstPeerFailure(): { userId: string; triggered: boolean } | null {
        const firstEntry = this.videoPeers.entries().next().value as
            | [string, { promise: Promise<RemotePeer>; abortController: AbortController }]
            | undefined;

        if (!firstEntry) {
            console.warn("[DEBUG] No video peers found to force failure");
            return null;
        }

        const [userId, peerObj] = firstEntry;

        peerObj.promise
            .then((peer) => {
                if (!peer.destroyed) {
                    console.info(`[DEBUG] Forcing destruction of peer ${userId} to trigger retry mechanism`);
                    peer.destroy();
                }
            })
            .catch((error) => {
                console.error(`[DEBUG] Error while forcing peer failure for ${userId}:`, error);
            });

        return { userId, triggered: true };
    }
}
