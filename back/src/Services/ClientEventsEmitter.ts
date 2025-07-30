import { EventEmitter } from "events";

const clientJoinEvent = "clientJoin";
const clientLeaveEvent = "clientLeave";
const spaceJoinEvent = "spaceJoin";
const spaceLeaveEvent = "spaceLeave";
const createSpaceEvent = "createSpace";
const deleteSpaceEvent = "deleteSpace";

class ClientEventsEmitter extends EventEmitter {
    emitClientJoin(clientUUid: string, roomId: string): void {
        this.emit(clientJoinEvent, clientUUid, roomId);
    }

    emitClientLeave(clientUUid: string, roomId: string): void {
        this.emit(clientLeaveEvent, clientUUid, roomId);
    }

    emitSpaceJoin(spaceName: string): void {
        this.emit(spaceJoinEvent, spaceName);
    }

    emitSpaceLeave(spaceName: string): void {
        this.emit(spaceLeaveEvent, spaceName);
    }

    emitCreateSpace(spaceName: string): void {
        this.emit(createSpaceEvent, spaceName);
    }

    emitDeleteSpace(spaceName: string): void {
        this.emit(deleteSpaceEvent, spaceName);
    }
    registerToClientJoin(callback: (clientUUid: string, roomId: string) => void): void {
        this.on(clientJoinEvent, callback);
    }

    registerToClientLeave(callback: (clientUUid: string, roomId: string) => void): void {
        this.on(clientLeaveEvent, callback);
    }

    registerToSpaceJoin(callback: (spaceName: string) => void): void {
        this.on(spaceJoinEvent, callback);
    }

    registerToSpaceLeave(callback: (spaceName: string) => void): void {
        this.on(spaceLeaveEvent, callback);
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

    unregisterFromSpaceJoin(callback: (spaceName: string) => void): void {
        this.removeListener(spaceJoinEvent, callback);
    }

    unregisterFromSpaceLeave(callback: (spaceName: string) => void): void {
        this.removeListener(spaceLeaveEvent, callback);
    }

    unregisterFromCreateSpace(callback: () => void): void {
        this.removeListener(createSpaceEvent, callback);
    }

    unregisterFromDeleteSpace(callback: () => void): void {
        this.removeListener(deleteSpaceEvent, callback);
    }
}

export const clientEventsEmitter = new ClientEventsEmitter();
