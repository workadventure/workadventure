import { EventEmitter } from "events";
import { Subject } from "rxjs";
import type { Space } from "../Model/Space";

class ClientEventsEmitter extends EventEmitter {
    public readonly spaceUpdatedSubject = new Subject<Space>();
    public readonly newSpaceSubject = new Subject<Space>();
    public readonly deleteSpaceSubject = new Subject<Space>();
    public readonly clientJoinSubject = new Subject<{ clientUUid: string; roomId: string }>();
    public readonly clientLeaveSubject = new Subject<{ clientUUid: string; roomId: string }>();
}

export const clientEventsEmitter = new ClientEventsEmitter();
