import type { SpaceUser } from "@workadventure/messages";
import type { ICommunicationState } from "../Interfaces/ICommunicationState";
import { CommunicationType } from "../Types/CommunicationTypes";

export class VoidState implements ICommunicationState {
    init(): void {
        return;
    }
    get communicationType(): string {
        return CommunicationType.NONE;
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
        //console.info("DefaultState handleUserToNotifyAdded", user);
        return Promise.resolve();
    }
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        //console.info("DefaultState handleUserToNotifyDeleted", user);
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
