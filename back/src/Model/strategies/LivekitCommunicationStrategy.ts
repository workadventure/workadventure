import { ICommunicationStrategy } from "../interfaces/ICommunicationStrategy";

import { ICommunicationSpaceManager } from "../interfaces/ICommunicationSpaceManager";
import { SpaceUser } from "@workadventure/messages";

export class LivekitCommunicationStrategy implements ICommunicationStrategy {
    
    constructor(private space: ICommunicationSpaceManager) {
    }

    addUser(user: SpaceUser): void {
    }

    deleteUser(user: SpaceUser): void {
    }
    
    updateUser(user: SpaceUser): void {
    }

    initialize(): void {
    }

    cleanup(): void {
    }
}
