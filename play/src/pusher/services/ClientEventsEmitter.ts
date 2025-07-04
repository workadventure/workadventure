import { EventEmitter } from "events";

const clientJoinEvent = "clientJoin";
const clientLeaveEvent = "clientLeave";
const clientJoinSpaceEvent = "clientJoinSpace";
const clientLeaveSpaceEvent = "clientLeaveSpace";
const createSpaceEvent = "createSpace";
const deleteSpaceEvent = "deleteSpace";
const spaceEventEvent = "spaceEvent";
const watchSpaceEvent = "watchSpace";
const unwatchSpaceEvent = "unwatchSpace";

export class ClientEventsEmitter extends EventEmitter {
    emitClientJoin(clientUUid: string, roomId: string): void {
        this.emit(clientJoinEvent, clientUUid, roomId);
    }

    emitClientLeave(clientUUid: string, roomId: string): void {
        this.emit(clientLeaveEvent, clientUUid, roomId);
    }

    emitClientJoinSpace(clientUUid: string, spaceName: string): void {
        this.emit(clientJoinSpaceEvent, clientUUid, spaceName);
    }

    emitClientLeaveSpace(clientUUid: string, spaceName: string): void {
        this.emit(clientLeaveSpaceEvent, clientUUid, spaceName);
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

    emitWatchSpace(spaceName: string): void {
        this.emit(watchSpaceEvent, spaceName);
    }

    emitUnwatchSpace(spaceName: string): void {
        this.emit(unwatchSpaceEvent, spaceName);
    }

    registerToClientJoin(callback: (clientUUid: string, roomId: string) => void): void {
        this.on(clientJoinEvent, callback);
    }

    registerToClientLeave(callback: (clientUUid: string, roomId: string) => void): void {
        this.on(clientLeaveEvent, callback);
    }

    registerToClientJoinSpace(callback: (clientUUid: string, spaceName: string) => void): void {
        this.on(clientJoinSpaceEvent, callback);
    }

    registerToClientLeaveSpace(callback: (clientUUid: string, spaceName: string) => void): void {
        this.on(clientLeaveSpaceEvent, callback);
    }

    registerToCreateSpace(callback: (spaceName: string) => void): void {
        this.on(createSpaceEvent, callback);
    }

    registerToDeleteSpace(callback: (spaceName: string) => void): void {
        this.on(deleteSpaceEvent, callback);
    }

    registerToSpaceEvent(callback: (spaceName: string, eventType: string) => void): void {
        this.on(spaceEventEvent, callback);
    }

    registerFromWatchSpace(callback: (spaceName: string) => void): void {
        this.on(watchSpaceEvent, callback);
    }

    registerFromUnwatchSpace(callback: (spaceName: string) => void): void {
        this.on(unwatchSpaceEvent, callback);
    }
    unregisterFromClientJoin(callback: (clientUUid: string, roomId: string) => void): void {
        this.removeListener(clientJoinEvent, callback);
    }

    unregisterFromClientLeave(callback: (clientUUid: string, roomId: string) => void): void {
        this.removeListener(clientLeaveEvent, callback);
    }

    unregisterFromClientJoinSpace(callback: (clientUUid: string, spaceName: string) => void): void {
        this.removeListener(clientJoinSpaceEvent, callback);
    }

    unregisterFromClientLeaveSpace(callback: (clientUUid: string, spaceName: string) => void): void {
        this.removeListener(clientLeaveSpaceEvent, callback);
    }

    unregisterFromCreateSpace(callback: (spaceName: string) => void): void {
        this.removeListener(createSpaceEvent, callback);
    }

    unregisterFromDeleteSpace(callback: (spaceName: string) => void): void {
        this.removeListener(deleteSpaceEvent, callback);
    }

    unregisterFromSpaceEvent(callback: (spaceName: string, eventType: string) => void): void {
        this.removeListener(spaceEventEvent, callback);
    }

    unregisterFromWatchSpace(callback: (spaceName: string) => void): void {
        this.removeListener(watchSpaceEvent, callback);
    }

    unregisterFromUnwatchSpace(callback: (spaceName: string) => void): void {
        this.removeListener(unwatchSpaceEvent, callback);
    }
}

export const clientEventsEmitter = new ClientEventsEmitter();
