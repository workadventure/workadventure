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
}
