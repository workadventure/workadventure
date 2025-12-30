import type { SpaceUser } from "@workadventure/messages";
import type { ICommunicationState, StateTransitionResult } from "../Interfaces/ICommunicationState";
import { CommunicationType } from "../Types/CommunicationTypes";

export class VoidState implements ICommunicationState {
    init(): void {
        return;
    }
    get communicationType(): string {
        return CommunicationType.NONE;
    }
    handleUserAdded(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        return Promise.resolve();
    }
    handleUserDeleted(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        return Promise.resolve();
    }
    handleUserUpdated(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        return Promise.resolve();
    }
    handleUserToNotifyAdded(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        return Promise.resolve();
    }
    handleUserToNotifyDeleted(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        return Promise.resolve();
    }
    switchState(targetCommunicationType: string): void {
        return;
    }
    finalize(): void {
        return;
    }
    shouldSwitchToNextState(): boolean {
        return false;
    }
    getNextStateType(): CommunicationType | null {
        return null;
    }

    public getCommunicationType(): string {
        return CommunicationType.NONE;
    }
}
