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
    handleStartRecording(): void {
        console.info("DefaultState handleStartRecording");
    }
    handleStopRecording(): void {
        console.info("DefaultState handleStopRecording");
    }
}
