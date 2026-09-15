import * as Sentry from "@sentry/node";
import {
    type HandleLivekitWebhookRequest,
    RecordingWebhookPhase,
    type HandleRecordingWebhookRequest,
    type MeetingConnectionRestartMessage,
    type SpaceUser,
} from "@workadventure/messages";
import { MAX_USERS_FOR_WEBRTC } from "../Enum/EnvironmentVariable";
import { adminApi, type RecordingEventPayload } from "../Services/AdminApi";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import type { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import type { ICommunicationState, IRecordableState } from "./Interfaces/ICommunicationState";
import { CommunicationType } from "./Types/CommunicationTypes";
import { WebRTCState } from "./States/WebRTCState";
import { VoidState } from "./States/VoidState";
import type { IRecordingManager, ManagedRecordingState } from "./RecordingManager";
import { RecordingManager } from "./RecordingManager";
import { UserRegistry } from "./Services/UserRegistry";
import { TransitionPolicy } from "./Policies/TransitionPolicy";
import { TransitionOrchestrator } from "./Services/TransitionOrchestrator";
import { StateLifecycleManager } from "./Services/StateLifecycleManager";
import { LivekitAvailabilityService } from "./Services/LivekitAvailabilityService";
import type { IUserRegistry } from "./Interfaces/IUserRegistry";
import type { ITransitionPolicy } from "./Interfaces/ITransitionPolicy";
import type { ITransitionOrchestrator, TransitionContext } from "./Interfaces/ITransitionOrchestrator";
import type { IStateLifecycleManager } from "./Interfaces/IStateLifecycleManager";
import type { ICommunicationStrategy, IRecordableStrategy } from "./Interfaces/ICommunicationStrategy";

/**
 * Factory interface for creating the initial communication state.
 * Used for dependency injection in tests.
 */
export interface InitialStateFactory {
    createInitialState(
        space: ICommunicationSpace,
        users: ReadonlyMap<string, SpaceUser>,
        usersToNotify: ReadonlyMap<string, SpaceUser>,
    ): ICommunicationState<ICommunicationStrategy>;
}

/**
 * Default implementation of InitialStateFactory.
 * Creates WebRTCState or VoidState based on media properties.
 */
export class DefaultInitialStateFactory implements InitialStateFactory {
    createInitialState(
        space: ICommunicationSpace,
        users: ReadonlyMap<string, SpaceUser>,
        usersToNotify: ReadonlyMap<string, SpaceUser>,
    ): ICommunicationState<ICommunicationStrategy> {
        const propertiesToSync = space.getPropertiesToSync();
        const hasMediaProperties = propertiesToSync.some((prop) =>
            ["cameraState", "microphoneState", "screenSharingState"].includes(prop),
        );

        return hasMediaProperties ? new WebRTCState(space, users, usersToNotify) : new VoidState();
    }
}

/**
 * Dependencies for CommunicationManager.
 * All fields are optional - defaults will be used if not provided.
 */
export interface CommunicationManagerDependencies {
    userRegistry?: IUserRegistry;
    policy?: ITransitionPolicy;
    orchestrator?: ITransitionOrchestrator;
    lifecycleManager?: IStateLifecycleManager;
    initialStateFactory?: InitialStateFactory;
    livekitToWebRTCDelayMs?: number;
    recordingManager?: IRecordingManager;
    /** Where recording lifecycle events go; the admin API by default. */
    recordingEventNotifier?: (payload: RecordingEventPayload) => Promise<void>;
}

/**
 * Facade for managing communication states in a space.
 *
 * This class coordinates multiple specialized services:
 * - UserRegistry: manages user collections
 * - TransitionPolicy: decides when transitions should occur (pure logic)
 * - TransitionOrchestrator: executes transitions with proper timing and cancellation
 * - StateLifecycleManager: manages state initialization and finalization
 *
 * Single Responsibility: Coordinate the services and expose a simple API.
 */
export class CommunicationManager implements ICommunicationManager {
    private readonly userRegistry: IUserRegistry;
    private readonly policy: ITransitionPolicy;
    private readonly orchestrator: ITransitionOrchestrator;
    private readonly lifecycleManager: IStateLifecycleManager;
    private readonly space: ICommunicationSpace;
    private readonly _recordingManager: IRecordingManager;
    private readonly recordingEventNotifier: (payload: RecordingEventPayload) => Promise<void>;

    private static readonly DEFAULT_LIVEKIT_TO_WEBRTC_DELAY_MS = 20_000; // 20 seconds

    /**
     * Creates a new CommunicationManager.
     *
     * @param space - The communication space to manage
     * @param dependencies - Optional dependencies for dependency injection (useful for testing)
     */
    constructor(space: ICommunicationSpace, dependencies: CommunicationManagerDependencies = {}) {
        this.space = space;

        const delayMs = dependencies.livekitToWebRTCDelayMs ?? CommunicationManager.DEFAULT_LIVEKIT_TO_WEBRTC_DELAY_MS;

        // Initialize user registry
        this.userRegistry = dependencies.userRegistry ?? new UserRegistry();

        // Initialize transition orchestrator
        this.orchestrator = dependencies.orchestrator ?? new TransitionOrchestrator(delayMs);

        // Create initial state using factory or default
        if (dependencies.lifecycleManager) {
            this.lifecycleManager = dependencies.lifecycleManager;
        } else {
            const stateFactory = dependencies.initialStateFactory ?? new DefaultInitialStateFactory();
            const initialState = stateFactory.createInitialState(
                this.space,
                this.userRegistry.getUsers(),
                this.userRegistry.getUsersToNotify(),
            );
            this.lifecycleManager = new StateLifecycleManager(initialState);
            initialState.init().catch((e) => {
                console.error("Error during initial state initialization:", e);
                Sentry.captureException(e);
            });
        }
        this._recordingManager =
            dependencies.recordingManager ??
            new RecordingManager(this.space, this.orchestrator, this.userRegistry, this.lifecycleManager);
        this.recordingEventNotifier =
            dependencies.recordingEventNotifier ?? ((payload) => adminApi.notifyRecordingEvent(payload));

        // Initialize transition policy with LiveKit availability checker
        this.policy =
            dependencies.policy ??
            new TransitionPolicy(MAX_USERS_FOR_WEBRTC, new LivekitAvailabilityService(), this._recordingManager);
    }

    public getRecordingState(): ManagedRecordingState {
        return this._recordingManager.getRecordingState();
    }

    public async handleUserAdded(user: SpaceUser): Promise<void> {
        this._recordingManager.handleAddUser(user);
        this.userRegistry.addUser(user);
        this.cancelPendingTransitionIfNeeded();

        // Decide the strategy before telling the joiner which one to use. If this join tips the
        // bubble into LiveKit, the old state's switchState() already told the joiner (the registry
        // maps are shared with the states) and the new state's init() already added them.
        const stateBefore = this.lifecycleManager.getCurrentState();
        await this.evaluateAndHandleTransition(user);
        if (this.lifecycleManager.getCurrentState() === stateBefore) {
            await stateBefore.handleUserAdded(user);
        }
    }

    public async handleUserDeleted(user: SpaceUser): Promise<void> {
        this.userRegistry.deleteUser(user.spaceUserId);
        this.cancelPendingTransitionIfNeeded();

        await this.lifecycleManager.getCurrentState().handleUserDeleted(user);
        await this.evaluateAndHandleTransition(user);
    }

    public async handleUserUpdated(user: SpaceUser): Promise<void> {
        await this.lifecycleManager.getCurrentState().handleUserUpdated(user);
    }

    public async handleUserToNotifyAdded(user: SpaceUser): Promise<void> {
        this.userRegistry.addUserToNotify(user);
        this.cancelPendingTransitionIfNeeded();

        // Same ordering as handleUserAdded.
        const stateBefore = this.lifecycleManager.getCurrentState();
        await this.evaluateAndHandleTransition(user);
        if (this.lifecycleManager.getCurrentState() === stateBefore) {
            await stateBefore.handleUserToNotifyAdded(user);
        }
    }

    public async handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        this.userRegistry.deleteUserToNotify(user.spaceUserId);
        this.cancelPendingTransitionIfNeeded();

        await this.lifecycleManager.getCurrentState().handleUserToNotifyDeleted(user);
        await this.evaluateAndHandleTransition(user);
    }

    /**
     * Evaluates if a transition is needed and handles it accordingly.
     */
    private async evaluateAndHandleTransition(user: SpaceUser): Promise<void> {
        // Wait for any ongoing transition to complete
        await this.orchestrator.waitForTransitionLock();

        const currentType = this.lifecycleManager.getCurrentState().communicationType as CommunicationType;
        const userCount = this.space.getAllUsers().length;

        // Check if transition is needed
        if (!this.policy.shouldTransition(currentType, userCount)) {
            return;
        }

        const nextStateType = this.policy.getNextStateType(currentType, userCount);
        if (!nextStateType) {
            return;
        }

        // Execute transition with lock
        await this.executeTransition(nextStateType, user);
    }

    /**
     * Executes a state transition to the specified type.
     */
    private async executeTransition(nextStateType: CommunicationType, user: SpaceUser): Promise<void> {
        // Cancel any existing pending transition
        this.orchestrator.cancelPendingTransition();

        const context: TransitionContext = {
            space: this.space,
            users: this.userRegistry.getUsers(),
            usersToNotify: this.userRegistry.getUsersToNotify(),
            playUri: user.playUri,
        };

        // Handle different transition types
        if (nextStateType === CommunicationType.LIVEKIT) {
            // Immediate transition to LiveKit
            await this.executeImmediateTransitionWithValidation(nextStateType, context);
        } else if (nextStateType === CommunicationType.WEBRTC) {
            // Delayed transition to WebRTC
            this.scheduleDelayedTransitionWithValidation(nextStateType, context);
        }
    }

    /**
     * Executes an immediate transition with validation.
     */
    private async executeImmediateTransitionWithValidation(
        type: CommunicationType,
        context: TransitionContext,
    ): Promise<void> {
        // Hold the transition lock while the next state is created, so a handler arriving mid-creation
        // (typically the joiner's watch) waits for this transition instead of cancelling it and creating
        // a second LiveKit state. The lock is released as soon as the new state is current and the switch
        // has been dispatched, NOT after init(): a user joining during init() must be notified through
        // the new state right away, before init() sends them their LiveKit invitation.
        let released = false;
        let release!: () => void;
        this.orchestrator.setTransitionLock(
            new Promise<void>((resolve) => {
                release = resolve;
            }),
        );
        const releaseLock = () => {
            if (released) return;
            released = true;
            this.orchestrator.clearTransitionLock();
            release();
        };
        try {
            const nextState = await this.orchestrator.executeImmediateTransition(type, context);

            if (!nextState) {
                return;
            }

            // Final validation before setting state
            const currentType = this.lifecycleManager.getCurrentState().communicationType as CommunicationType;
            const userCount = this.space.getAllUsers().length;

            if (!this.policy.shouldTransition(currentType, userCount)) {
                return;
            }

            const expectedNextType = this.policy.getNextStateType(currentType, userCount);
            if (expectedNextType && nextState.communicationType !== expectedNextType) {
                return;
            }

            // transitionTo() swaps the current state and dispatches the switch synchronously, then awaits init().
            const transition = this.lifecycleManager.transitionTo(nextState);
            releaseLock();
            await transition;
        } finally {
            releaseLock();
        }
    }

    /**
     * Schedules a delayed transition with validation.
     */
    private scheduleDelayedTransitionWithValidation(type: CommunicationType, context: TransitionContext): void {
        this.orchestrator.scheduleDelayedTransition(
            type,
            context,
            (nextState) => {
                // Final validation before setting state
                const currentType = this.lifecycleManager.getCurrentState().communicationType as CommunicationType;
                const userCount = this.space.getAllUsers().length;

                if (!this.policy.shouldTransition(currentType, userCount)) {
                    return;
                }

                const expectedNextType = this.policy.getNextStateType(currentType, userCount);
                if (!expectedNextType || nextState.communicationType === expectedNextType) {
                    this.lifecycleManager.transitionTo(nextState).catch((error) => {
                        console.error("Error during delayed transition:", error);
                        Sentry.captureException(error);
                    });
                }
            },
            (error) => {
                console.error("Error during scheduled transition:", error);
            },
        );
    }

    /**
     * Cancels pending transition if conditions no longer allow switching.
     */
    private cancelPendingTransitionIfNeeded(): void {
        if (!this.orchestrator.hasPendingTransition()) {
            return;
        }

        const currentType = this.lifecycleManager.getCurrentState().communicationType as CommunicationType;
        const userCount = this.space.getAllUsers().length;

        if (!this.policy.shouldTransition(currentType, userCount)) {
            this.orchestrator.cancelPendingTransition();
        }
    }

    public handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId: string,
    ) {
        this.lifecycleManager
            .getCurrentState()
            .handleMeetingConnectionRestartMessage(meetingConnectionRestartMessage, senderUserId);
    }
    public async handleStartRecording(user: SpaceUser): Promise<void> {
        this.cancelPendingTransitionIfNeeded();
        await this._recordingManager.startRecording(user);
    }

    public async handleStopRecording(user: SpaceUser): Promise<void> {
        await this._recordingManager.stopRecording(user);
    }

    public async handleRecorderLeftSpace(spaceUserId: string): Promise<boolean> {
        const stoppedRecorder = await this._recordingManager.stopRecordingIfRecorderMatches(spaceUserId);
        return stoppedRecorder !== null;
    }

    public async handleServerStopRecording(): Promise<boolean> {
        const stoppedRecorder = await this._recordingManager.stopRecordingByServer();
        return stoppedRecorder !== null;
    }

    public async handleLivekitWebhook(request: HandleLivekitWebhookRequest): Promise<void> {
        if (!this._recordingManager.hasRecordingSession(request.recordingSessionId)) {
            // Retrying cannot recreate a local recording session that is already gone, so acknowledge as ignored.
            console.warn(
                `Received LiveKit webhook for missing recording session ${request.recordingSessionId}. Ignoring.`,
            );
            return;
        }

        const currentState = this.lifecycleManager.getCurrentState();
        if (!this.isRecordableState(currentState)) {
            throw new Error("Current state is not recordable");
        }

        const normalizedRequest = await currentState.handleLivekitWebhook(
            request.rawBody,
            request.authorizationHeader || undefined,
            request.spaceName,
            request.recordingSessionId,
        );
        if (normalizedRequest === "ignored") {
            return;
        }

        this.handleNormalizedRecordingWebhook(normalizedRequest);
    }

    public handleNormalizedRecordingWebhook(request: HandleRecordingWebhookRequest): void {
        switch (request.phase) {
            case RecordingWebhookPhase.RECORDING_WEBHOOK_PHASE_STARTED: {
                this._recordingManager.confirmRecordingStartedByWebhook(
                    request.recordingSessionId,
                    request.egressId,
                    request.roomName,
                );
                return;
            }
            case RecordingWebhookPhase.RECORDING_WEBHOOK_PHASE_ENDED: {
                const result = this._recordingManager.finishRecordingByWebhook(
                    request.recordingSessionId,
                    request.egressId,
                    request.roomName,
                );
                if (!result.processed || !result.recorder) {
                    return;
                }

                this.notifyRecordingEnded(request, result.recorder);

                if (result.unexpected) {
                    this.space.dispatchPrivateEvent({
                        spaceName: this.space.getSpaceName(),
                        receiverUserId: result.recorder.spaceUserId,
                        senderUserId: result.recorder.spaceUserId,
                        spaceEvent: {
                            event: {
                                $case: "recordingUnexpectedlyStoppedMessage",
                                recordingUnexpectedlyStoppedMessage: {},
                            },
                        },
                    });
                }

                if (!result.hasActiveSessions) {
                    this.scheduleTransitionAfterRecordingStops(result.recorder);
                }
                return;
            }
            case RecordingWebhookPhase.RECORDING_WEBHOOK_PHASE_UNSPECIFIED:
            case RecordingWebhookPhase.UNRECOGNIZED:
                return;
        }
    }

    /**
     * Fire-and-forget: the admin turning this into customer webhooks must
     * never delay or fail the recording flow itself. Only the end of an
     * egress is reported; the admin reads the status to tell a usable
     * recording from a failed one.
     */
    private notifyRecordingEnded(request: HandleRecordingWebhookRequest, recorder: SpaceUser): void {
        const payload: RecordingEventPayload = {
            phase: "ended",
            status: request.status,
            egressId: request.egressId,
            recordingSessionId: request.recordingSessionId,
            playUri: recorder.playUri,
            recorder: { uuid: recorder.uuid, spaceUserId: recorder.spaceUserId },
            startedAt: request.startedAtMs ? new Date(request.startedAtMs).toISOString() : null,
            endedAt: request.endedAtMs ? new Date(request.endedAtMs).toISOString() : null,
            error: request.error || null,
            files: request.fileResults.map((file) => ({
                filename: file.filename,
                sizeBytes: file.sizeBytes,
                durationSeconds: Math.round(file.durationMs / 1_000),
            })),
        };

        this.recordingEventNotifier(payload).catch((error) => {
            console.error(`Failed to notify the admin of a recording end (egress ${request.egressId}):`, error);
            Sentry.captureException(error);
        });
    }

    private scheduleTransitionAfterRecordingStops(user: SpaceUser): void {
        const context: TransitionContext = {
            space: this.space,
            users: this.userRegistry.getUsers(),
            usersToNotify: this.userRegistry.getUsersToNotify(),
            playUri: user.playUri,
        };
        this.scheduleDelayedTransitionWithValidation(CommunicationType.WEBRTC, context);
    }

    private isRecordableState(
        state: ICommunicationState<ICommunicationStrategy>,
    ): state is IRecordableState<IRecordableStrategy> {
        return "handleStartRecording" in state && "handleStopRecording" in state && "handleLivekitWebhook" in state;
    }

    public destroy(): void {
        this._recordingManager.destroy();
    }
}

/**
 * Export configuration for backward compatibility.
 */
export const CommunicationConfig = {
    MAX_USERS_FOR_WEBRTC,
};
