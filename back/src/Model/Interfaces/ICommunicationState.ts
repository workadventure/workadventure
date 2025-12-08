import type { SpaceUser } from "@workadventure/messages";

export interface StateTransitionResult {
    nextStatePromise?: Promise<ICommunicationState>;
    abortController?: AbortController;
}

export interface ICommunicationState {
    get communicationType(): string;
    init(): void;
    handleUserAdded(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void>;
    handleUserDeleted(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void>;
    handleUserUpdated(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void>;
    switchState(targetCommunicationType: string): void;
    finalize(): void;
}
