import { EventEmitter } from "events";

const clientJoinEvent = "clientJoin";
const clientLeaveEvent = "clientLeave";

class ClientEventsEmitter extends EventEmitter {
    emitClientJoin(clientUUid: string, roomId: string, world: string | null): void {
        this.emit(clientJoinEvent, clientUUid, roomId, world);
    }

    emitClientLeave(clientUUid: string, roomId: string, world: string | null): void {
        this.emit(clientLeaveEvent, clientUUid, roomId, world);
    }

    registerToClientJoin(callback: (clientUUid: string, roomId: string, world: string | null) => void): void {
        this.on(clientJoinEvent, callback);
    }

    registerToClientLeave(callback: (clientUUid: string, roomId: string, world: string | null) => void): void {
        this.on(clientLeaveEvent, callback);
    }

    unregisterFromClientJoin(callback: (clientUUid: string, roomId: string, world: string | null) => void): void {
        this.removeListener(clientJoinEvent, callback);
    }

    unregisterFromClientLeave(callback: (clientUUid: string, roomId: string, world: string | null) => void): void {
        this.removeListener(clientLeaveEvent, callback);
    }
}

export const clientEventsEmitter = new ClientEventsEmitter();
