const EventEmitter = require("events");

const clientJoinEvent = "clientJoin";
const clientLeaveEvent = "clientLeave";

const webexMeetingStartEvent = "webexStart";
const webexMeetingStopEvent = "webexStop";

class ClientEventsEmitter extends EventEmitter {
    // TODO -> Remove
    emitMeetingStart(clientUUid: string, roomId: string, meetingLink: string): void {
        // https://nodejs.org/api/events.html#events_passing_arguments_and_this_to_listeners
        this.emit(webexMeetingStartEvent, clientUUid, roomId, meetingLink);
    }

    emitMeetingStop(clientUUid: string, roomId: string): void {
        this.emit(webexMeetingStopEvent, clientUUid, roomId);
    }

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
