import { MeetingConnectionRestartMessage, SpaceUser } from "@workadventure/messages";
import { ICommunicationState } from "../Interfaces/ICommunicationState";
import { CommunicationType } from "../Types/CommunicationTypes";

export class VoidState implements ICommunicationState {
    init(): void {
        return;
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
    handleUserAdded(user: SpaceUser): Promise<void> {
        return Promise.resolve();
    }
    handleUserDeleted(user: SpaceUser): Promise<void> {
        return Promise.resolve();
    }
    handleUserUpdated(user: SpaceUser): Promise<void> {
        return Promise.resolve();
    }
    handleUserReadyForSwitch(userId: string): Promise<void> {
        return Promise.resolve();
    }
    handleUserToNotifyAdded(user: SpaceUser): Promise<void> {
        return Promise.resolve();
    }
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        return Promise.resolve();
    }
    switchState(): void {
        return;
    }
    finalize(): void {
        return;
    }

    public getCommunicationType(): string {
        return CommunicationType.NONE;
    }
}
