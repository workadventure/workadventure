import * as Sentry from "@sentry/node";
import type { SpaceUser, PrivateEvent, MeetingConnectionRestartMessage } from "@workadventure/messages";
import type { CommunicationType } from "../Types/CommunicationTypes";
import type { ICommunicationState, StateTransitionResult } from "../Interfaces/ICommunicationState";
import type { ICommunicationStrategy, IRecordableStrategy } from "../Interfaces/ICommunicationStrategy";
import { CommunicationConfig } from "../CommunicationManager";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
export abstract class CommunicationState<T extends ICommunicationStrategy> implements ICommunicationState<T> {
    protected _switchTimeout: NodeJS.Timeout | null = null;
    protected abstract _communicationType: CommunicationType;
    protected _switchInitiatorUserId: string | null = null;

    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _currentStrategy: T,
        protected users: ReadonlyMap<string, SpaceUser>,
        protected usersToNotify: ReadonlyMap<string, SpaceUser>,
        protected readonly MAX_USERS_FOR_WEBRTC: number = Number(CommunicationConfig.MAX_USERS_FOR_WEBRTC),
    ) {}

    /**
     * The users this state told its strategy to. A user must hear it before any message about a peer (a WebRTC start):
     * the front only listens to those once it knows the strategy, and drops them otherwise.
     */
    private readonly toldStrategy = new Set<string>();

    public init(): Promise<void> {
        // Everyone already in the registries heard of this state from the previous one's switchState()
        for (const spaceUserId of [...this.users.keys(), ...this.usersToNotify.keys()]) {
            this.toldStrategy.add(spaceUserId);
        }
        return this._currentStrategy.initialize(this.users, this.usersToNotify);
    }

    /**
     * Tells the strategy to every user of the registries who has not heard it yet, not only the one being handled: after
     * a wait on the transition lock, several users sit in the registries before any of their handlers runs, and the
     * first handler already pairs them up.
     */
    private tellStrategyToNewcomers(): void {
        for (const user of [...this.users.values(), ...this.usersToNotify.values()]) {
            if (!this.toldStrategy.has(user.spaceUserId)) {
                this.toldStrategy.add(user.spaceUserId);
                this.notifyUserOfCurrentStrategy(user, this._communicationType);
            }
        }
    }

    /** A user who left both registries hears the strategy again when they come back. */
    private forgetIfGone(user: SpaceUser): void {
        if (!this.users.has(user.spaceUserId) && !this.usersToNotify.has(user.spaceUserId)) {
            this.toldStrategy.delete(user.spaceUserId);
        }
    }

    dispatchSwitchEvent(
        userId: string,
        event: Extract<
            NonNullable<PrivateEvent["spaceEvent"]>["event"],
            {
                $case: "switchMessage" | "finalizeSwitchMessage";
            }
        >,
    ): void {
        const privateEvent: PrivateEvent = {
            spaceName: this._space.getSpaceName(),
            receiverUserId: userId,
            senderUserId: userId,
            spaceEvent: {
                event,
            },
        };
        this._space.dispatchPrivateEvent(privateEvent);
    }

    handleUserAdded(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void> {
        try {
            this.tellStrategyToNewcomers();
            this._currentStrategy.addUser(user).catch((e) => {
                Sentry.captureException(e);
                console.error(e);
            });
            return Promise.resolve();
        } catch (e) {
            console.error(e);
            return Promise.resolve();
        }
    }
    handleUserDeleted(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void> {
        this.forgetIfGone(user);
        this._currentStrategy.deleteUser(user);
        return Promise.resolve();
    }
    handleUserUpdated(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void> {
        this._currentStrategy.updateUser(user);
        return Promise.resolve();
    }
    handleUserToNotifyAdded(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void> {
        try {
            this.tellStrategyToNewcomers();
            this._currentStrategy.addUserToNotify(user).catch((e) => {
                Sentry.captureException(e);
                console.error(e);
            });
        } catch (e) {
            console.error(e);
            return Promise.resolve();
        }
        return Promise.resolve();
    }
    handleUserToNotifyDeleted(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void> {
        this.forgetIfGone(user);
        this._currentStrategy.deleteUserFromNotify(user);
        return Promise.resolve();
    }

    public switchState(targetCommunicationType: string): void {
        // Let's merge this.users and this.usersToNotify to get all users
        const allUsers = new Map<string, SpaceUser>([...this.users, ...this.usersToNotify]);
        for (const user of allUsers.values()) {
            this.dispatchSwitchEvent(user.spaceUserId, {
                $case: "switchMessage",
                switchMessage: {
                    strategy: targetCommunicationType,
                },
            });
        }
    }

    protected notifyUserOfCurrentStrategy(user: SpaceUser, strategy: CommunicationType): void {
        this.dispatchSwitchEvent(user.spaceUserId, {
            $case: "switchMessage",
            switchMessage: { strategy },
        });
    }

    public handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId: string,
    ): void {
        this._currentStrategy.handleMeetingConnectionRestartMessage(meetingConnectionRestartMessage, senderUserId);
    }

    public finalize(): void {
        // Let's merge this.users and this.usersToNotify to get all users
        const allUsers = new Map<string, SpaceUser>([...this.users, ...this.usersToNotify]);
        for (const user of allUsers.values()) {
            this.dispatchSwitchEvent(user.spaceUserId, {
                $case: "finalizeSwitchMessage",
                finalizeSwitchMessage: {
                    strategy: this._communicationType,
                },
            });
        }
    }

    get communicationType(): string {
        return this._communicationType;
    }

    protected isRecordableStrategy(strategy: ICommunicationStrategy): strategy is IRecordableStrategy {
        return "startRecording" in strategy && "stopRecording" in strategy;
    }
}
