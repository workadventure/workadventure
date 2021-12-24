import { EventEmitter } from "events";

const clientJoinEvent = "clientJoin";
const clientLeaveEvent = "clientLeave";

class ClientEventsEmitter extends EventEmitter {
    emitClientJoin(clientUUid: string, roomId: string): void {
        this.emit(clientJoinEvent, clientUUid, roomId);
    }

    emitClientLeave(clientUUid: string, roomId: string): void {
        this.emit(clientLeaveEvent, clientUUid, roomId);
    }

    registerToClientJoin(callback: (clientUUid: string, roomId: string) => void): void {
        this.on(clientJoinEvent, callback);
    }

    registerToClientLeave(callback: (clientUUid: string, roomId: string) => void): void {
        this.on(clientLeaveEvent, callback);
    }

    unregisterFromClientJoin(callback: (clientUUid: string, roomId: string) => void): void {
        this.removeListener(clientJoinEvent, callback);
    }

    unregisterFromClientLeave(callback: (clientUUid: string, roomId: string) => void): void {
        this.removeListener(clientLeaveEvent, callback);
    }
}

export const clientEventsEmitter = new ClientEventsEmitter();
