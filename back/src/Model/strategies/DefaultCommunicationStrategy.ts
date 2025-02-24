import { ICommunicationStrategy } from "../interfaces/ICommunicationStrategy";

import { ICommunicationSpaceManager } from "../interfaces/ICommunicationSpaceManager";
import { SpaceUser } from "@workadventure/messages";

export class DefaultCommunicationStrategy implements ICommunicationStrategy {
    
    constructor(private _space: ICommunicationSpaceManager) {
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
