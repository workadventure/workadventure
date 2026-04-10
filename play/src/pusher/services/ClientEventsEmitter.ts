import { EventEmitter } from "events";

const clientJoinEvent = "clientJoin";
const clientLeaveEvent = "clientLeave";
const createSpaceEvent = "createSpace";
const deleteSpaceEvent = "deleteSpace";

export class ClientEventsEmitter extends EventEmitter {
    emitClientJoin(clientUUid: string, roomId: string): void {
        this.emit(clientJoinEvent, clientUUid, roomId);
    }

    emitClientLeave(clientUUid: string, roomId: string): void {
        this.emit(clientLeaveEvent, clientUUid, roomId);
    }

    emitCreateSpace(spaceName: string): void {
        this.emit(createSpaceEvent, spaceName);
    }

    emitDeleteSpace(spaceName: string): void {
        this.emit(deleteSpaceEvent, spaceName);
    }

    emitSpaceEvent(spaceName: string, eventType: string): void {
        this.emit(spaceName, eventType);
    }

    registerToClientJoin(callback: (clientUUid: string, roomId: string) => void): void {
        this.on(clientJoinEvent, callback);
    }

    registerToClientLeave(callback: (clientUUid: string, roomId: string) => void): void {
        this.on(clientLeaveEvent, callback);
    }

    registerToCreateSpace(callback: (spaceName: string) => void): void {
        this.on(createSpaceEvent, callback);
    }

    registerToDeleteSpace(callback: (spaceName: string) => void): void {
        this.on(deleteSpaceEvent, callback);
    }

    unregisterFromClientJoin(callback: (clientUUid: string, roomId: string) => void): void {
        this.removeListener(clientJoinEvent, callback);
    }

    unregisterFromClientLeave(callback: (clientUUid: string, roomId: string) => void): void {
        this.removeListener(clientLeaveEvent, callback);
    }

    unregisterFromCreateSpace(callback: (spaceName: string) => void): void {
        this.removeListener(createSpaceEvent, callback);
    }

    unregisterFromDeleteSpace(callback: (spaceName: string) => void): void {
        this.removeListener(deleteSpaceEvent, callback);
    }
}

export const clientEventsEmitter = new ClientEventsEmitter();
