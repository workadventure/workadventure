import { SpaceUser } from "@workadventure/messages";
import { ICommunicationState } from "../Interfaces/ICommunicationState";

export class DefaultState implements ICommunicationState {
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
        console.info("DefaultState handleUserToNotifyAdded", user);
        return Promise.resolve();
    }
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        console.info("DefaultState handleUserToNotifyDeleted", user);
        return Promise.resolve();
    }
}
