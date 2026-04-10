import type { MeetingConnectionRestartMessage, SpaceUser } from "@workadventure/messages";
import type { ICommunicationState, StateTransitionResult } from "../Interfaces/ICommunicationState";
import { CommunicationType } from "../Types/CommunicationTypes";
import type { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";

export class VoidState implements ICommunicationState<ICommunicationStrategy> {
    init(): Promise<void> {
        return Promise.resolve();
    }
    get communicationType(): string {
        return CommunicationType.NONE;
    }
    handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId: string
    ): void {
        return;
    }
    handleUserAdded(
        user: SpaceUser
    ): Promise<StateTransitionResult<ICommunicationStrategy> | ICommunicationState<ICommunicationStrategy> | void> {
        return Promise.resolve();
    }
    handleUserDeleted(
        user: SpaceUser
    ): Promise<StateTransitionResult<ICommunicationStrategy> | ICommunicationState<ICommunicationStrategy> | void> {
        return Promise.resolve();
    }
    handleUserUpdated(
        user: SpaceUser
    ): Promise<StateTransitionResult<ICommunicationStrategy> | ICommunicationState<ICommunicationStrategy> | void> {
        return Promise.resolve();
    }
    handleUserToNotifyAdded(
        user: SpaceUser
    ): Promise<StateTransitionResult<ICommunicationStrategy> | ICommunicationState<ICommunicationStrategy> | void> {
        return Promise.resolve();
    }
    handleUserToNotifyDeleted(
        user: SpaceUser
    ): Promise<StateTransitionResult<ICommunicationStrategy> | ICommunicationState<ICommunicationStrategy> | void> {
        return Promise.resolve();
    }
    handleStartRecording(): void {
        return;
    }
    handleStopRecording(): void {
        return;
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
