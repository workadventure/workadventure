import type {
    AnalyticsEventReportMessage,
    TimedAnalyticsEventName,
    TimedAnalyticsEventOpenProperties,
} from "@workadventure/messages";
import { v4 as uuidv4 } from "uuid";

export type TimedAnalyticsEventHandle = {
    /** Idempotent: closing twice reports one interval, not two. */
    close(): void;
};

/**
 * Every interval currently open, so the front can drop them all when the socket dies.
 *
 * A handle used to be dropped by whoever held it — AnalyticsClient cleared its own
 * fields on disconnect. That stops working the moment a handle lives with the thing
 * it measures: CoWebsiteStore has no idea a socket exists, and should not learn.
 *
 * Spending a handle rather than deleting it is what makes that safe. The holder keeps
 * its reference and closes it whenever the user actually closes the thing; the close
 * is then a no-op, because the pusher already ended that interval as `socket_closed`
 * and a second close would travel over the new socket to be dropped as unpaired.
 */
const liveIntervals = new Set<() => void>();

/** The socket went away: every open interval is already ended, on the pusher's side. */
export function forgetOpenTimedAnalyticsEvents(): void {
    for (const spend of [...liveIntervals]) {
        spend();
    }
}

/**
 * Opens an interval and hands back the way to close it.
 *
 * The front says *when* something starts and stops; it never says how long it
 * lasted. The pusher holds the interval and emits one row on close, measured on its
 * own clock (AnalyticsTimedEventTracker). That is deliberate: with per-minute
 * sampling, faking an hour of collaboration took 60 forged events; a client-sent
 * duration would take one. Here the client cannot state a duration at all, so the
 * event name is refused outright from a socket.
 *
 * The pusher also closes anything still open when the socket dies, on shutdown, and
 * on a crash — so callers do not have to be careful, they have to be honest. What
 * cannot be covered is SIGKILL, where the interval is lost rather than guessed.
 *
 * These two frames are instructions, not events: they are intercepted in
 * processAnalyticsReportMessage and never reach the queue. Grepping the admin for
 * `timed_event.open` finds nothing, on purpose.
 */
export function openTimedAnalyticsEvent<N extends TimedAnalyticsEventName>(
    eventName: N,
    properties: TimedAnalyticsEventOpenProperties<N>,
    sendReport: (message: AnalyticsEventReportMessage) => void,
): TimedAnalyticsEventHandle {
    const handle = `${eventName}:${uuidv4()}`;
    let closed = false;
    const spend = (): void => {
        closed = true;
        liveIntervals.delete(spend);
    };
    liveIntervals.add(spend);

    sendReport({
        events: [
            {
                eventName: "timed_event.open",
                source: "front",
                clientEventTimeMs: Date.now(),
                eventId: `timed-open:${handle}`,
                properties: { handle, eventName, properties },
            },
        ],
    });

    return {
        close(): void {
            if (closed) {
                return;
            }
            spend();

            sendReport({
                events: [
                    {
                        eventName: "timed_event.close",
                        source: "front",
                        clientEventTimeMs: Date.now(),
                        eventId: `timed-close:${handle}`,
                        properties: { handle },
                    },
                ],
            });
        },
    };
}

/**
 * The intervals a caller measures several of at once, one per key.
 *
 * Areas and cowebsites both need this and both wrote it out by hand, identically:
 * open a key that is already open and the previous interval is closed first, rather
 * than overwritten. Overwriting is the bug worth naming — the stranded interval has
 * nothing left that could close it, so the pusher only ends it when the socket dies,
 * dating a walk-through to the end of the session.
 *
 * `closeAll` is for the owner's teardown. A map living on the analytics singleton had
 * no teardown to hook, which is how area dwells came to outlive the scene that opened
 * them while cowebsites, closed through their store, did not.
 */
export class TimedEventsByKey {
    private readonly open = new Map<string, TimedAnalyticsEventHandle>();

    /** Starts measuring `key`, ending whatever that key was already measuring. */
    public replace(key: string, handle: TimedAnalyticsEventHandle): void {
        this.open.get(key)?.close();
        this.open.set(key, handle);
    }

    public close(key: string): void {
        this.open.get(key)?.close();
        this.open.delete(key);
    }

    /** The owner is going away and these intervals really ended. */
    public closeAll(): void {
        for (const handle of this.open.values()) {
            handle.close();
        }
        this.open.clear();
    }

    /**
     * The socket went away. Drops the handles WITHOUT closing them, which is the
     * opposite of closeAll and deliberately so: the pusher has already ended every
     * one of these as `socket_closed`, so a close frame now would be sent over the
     * next socket and dropped there as unpaired — noise for a result already
     * recorded.
     */
    public forget(): void {
        this.open.clear();
    }
}
