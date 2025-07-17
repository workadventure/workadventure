import { SpaceUser } from "@workadventure/messages";
import { ICommunicationState } from "../Interfaces/ICommunicationState";

export class DefaultState implements ICommunicationState {
    handleUserAdded(user: SpaceUser): void {
        console.info("DefaultState handleUserAdded", user);
    }
    handleUserDeleted(user: SpaceUser): void {
        console.info("DefaultState handleUserDeleted", user);
    }
    handleUserUpdated(user: SpaceUser): void {
        console.info("DefaultState handleUserUpdated", user);
    }
    handleUserReadyForSwitch(userId: string): void {
        console.info("DefaultState handleUserReadyForSwitch", userId);
    }
    handleUserToNotifyAdded(user: SpaceUser): void {
        console.info("DefaultState handleUserToNotifyAdded", user);
    }
    handleUserToNotifyDeleted(user: SpaceUser): void {
        console.info("DefaultState handleUserToNotifyDeleted", user);
    }
}
