import type { SpaceUser } from "@workadventure/messages";
import type { ICommunicationStrategy, IRecordableStrategy } from "./ICommunicationStrategy";

export interface StateTransitionResult<T extends ICommunicationStrategy> {
    nextStatePromise?: Promise<ICommunicationState<T>>;
    abortController?: AbortController;
}

export interface ICommunicationState<T extends ICommunicationStrategy> {
    get communicationType(): string;
    init(): Promise<void>;
    handleUserAdded(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void>;
    handleUserDeleted(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void>;
    handleUserUpdated(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void>;
    switchState(targetCommunicationType: string): void;
    finalize(): void;
}

export interface IRecordableState<T extends IRecordableStrategy> extends ICommunicationState<T> {
    handleStartRecording(user: SpaceUser): Promise<void>;
    handleStopRecording(): Promise<void>;
}
