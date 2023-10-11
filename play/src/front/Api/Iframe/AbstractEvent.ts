import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import { ReceiveEventEvent } from "../Events/ReceiveEventEvent";

export type ScriptingEvent = ReceiveEventEvent;

export abstract class AbstractWorkadventureEventCommands {
    protected receivedEventResolvers = new Subject<ReceiveEventEvent>();
    protected eventSubscribers = new Map<string, Subject<ReceiveEventEvent>>();

    protected constructor() {
        //super();

        // Not unsubscribing is ok, this is two singletons never destroyed.
        //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
        this.receivedEventResolvers.subscribe((event) => {
            const subject = this.eventSubscribers.get(event.name);
            if (subject !== undefined) {
                subject.next(event);
            }
        });
    }

    on(key: string): Observable<ScriptingEvent> {
        let subject = this.eventSubscribers.get(key);
        if (subject === undefined) {
            subject = new Subject<ReceiveEventEvent>();
            this.eventSubscribers.set(key, subject);
        }
        return subject.asObservable();
    }
}
