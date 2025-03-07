import { SpaceUser } from "@workadventure/messages";
import { ICommunicationState } from "./ICommunicationState";

export interface ICommunicationManager {
    handleUserAdded(user: SpaceUser): void;
    handleUserDeleted(user: SpaceUser): void;
    handleUserUpdated(user: SpaceUser): void;
    handleUserReadyForSwitch(userId: number): void;
    setState(state: ICommunicationState): void;
}