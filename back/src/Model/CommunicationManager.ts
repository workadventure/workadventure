import type { SpaceUser } from "@workadventure/messages";
import { MAX_USERS_FOR_WEBRTC } from "../Enum/EnvironmentVariable";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import type { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import type { ICommunicationState } from "./Interfaces/ICommunicationState";
import { CommunicationType } from "./Types/CommunicationTypes";
import { WebRTCState } from "./States/WebRTCState";
import { VoidState } from "./States/VoidState";
import { UserRegistry } from "./Services/UserRegistry";
import { TransitionPolicy } from "./Policies/TransitionPolicy";
import { TransitionOrchestrator } from "./Services/TransitionOrchestrator";
import { StateLifecycleManager } from "./Services/StateLifecycleManager";
import { LivekitAvailabilityService } from "./Services/LivekitAvailabilityService";
import type { IUserRegistry } from "./Interfaces/IUserRegistry";
import type { ITransitionPolicy } from "./Interfaces/ITransitionPolicy";
import type { ITransitionOrchestrator, TransitionContext } from "./Interfaces/ITransitionOrchestrator";
import type { IStateLifecycleManager } from "./Interfaces/IStateLifecycleManager";

/**
 * Factory interface for creating the initial communication state.
 * Used for dependency injection in tests.
 */
export interface InitialStateFactory {
    createInitialState(
        space: ICommunicationSpace,
        users: ReadonlyMap<string, SpaceUser>,
        usersToNotify: ReadonlyMap<string, SpaceUser>
    ): ICommunicationState;
}

/**
 * Default implementation of InitialStateFactory.
 * Creates WebRTCState or VoidState based on media properties.
 */
export class DefaultInitialStateFactory implements InitialStateFactory {
    createInitialState(
        space: ICommunicationSpace,
        users: ReadonlyMap<string, SpaceUser>,
        usersToNotify: ReadonlyMap<string, SpaceUser>
    ): ICommunicationState {
        const propertiesToSync = space.getPropertiesToSync();
        const hasMediaProperties = propertiesToSync.some((prop) =>
            ["cameraState", "microphoneState", "screenSharingState"].includes(prop)
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

        // Initialize transition policy with LiveKit availability checker
        this.policy =
            dependencies.policy ?? new TransitionPolicy(MAX_USERS_FOR_WEBRTC, new LivekitAvailabilityService());

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
                this.userRegistry.getUsersToNotify()
            );
            this.lifecycleManager = new StateLifecycleManager(initialState);
            initialState.init();
        }
    }

    public async handleUserAdded(user: SpaceUser): Promise<void> {
        this.userRegistry.addUser(user);
        this.cancelPendingTransitionIfNeeded();

        await this.lifecycleManager.getCurrentState().handleUserAdded(user);
        await this.evaluateAndHandleTransition(user);
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

        await this.lifecycleManager.getCurrentState().handleUserToNotifyAdded(user);
        await this.evaluateAndHandleTransition(user);
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
        context: TransitionContext
    ): Promise<void> {
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

        this.lifecycleManager.transitionTo(nextState);
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
                    this.lifecycleManager.transitionTo(nextState);
                }
            },
            (error) => {
                console.error("Error during scheduled transition:", error);
            }
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
}

/**
 * Export configuration for backward compatibility.
 */
export const CommunicationConfig = {
    MAX_USERS_FOR_WEBRTC,
};
