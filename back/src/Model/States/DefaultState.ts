import { SpaceUser } from "@workadventure/messages";
import { ICommunicationState } from "../Interfaces/ICommunicationState";

export class DefaultState implements ICommunicationState {
    handleUserAdded(user: SpaceUser): Promise<void> {
        console.info("DefaultState handleUserAdded", user);
        return Promise.resolve();
    }
    handleUserDeleted(user: SpaceUser): Promise<void> {
        console.info("DefaultState handleUserDeleted", user);
        return Promise.resolve();
    }
    handleUserUpdated(user: SpaceUser): Promise<void> {
        console.info("DefaultState handleUserUpdated", user);
        return Promise.resolve();
    }
    handleUserReadyForSwitch(userId: string): Promise<void> {
        console.info("DefaultState handleUserReadyForSwitch", userId);
        return Promise.resolve();
    }
}
