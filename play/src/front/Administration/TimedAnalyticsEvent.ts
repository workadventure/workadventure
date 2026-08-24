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
 * Every interval currently open, so the front can act on all of them when the socket
 * goes and comes back.
 *
 * A handle used to be dropped by whoever held it — AnalyticsClient cleared its own
 * fields on disconnect. That stops working the moment a handle lives with the thing
 * it measures: CoWebsiteStore has no idea a socket exists, and should not learn.
 */
const openIntervals = new Set<SocketAwareInterval>();

type SocketAwareInterval = {
    socketGone(): void;
    socketBack(): void;
};

/**
 * The socket went away. Every interval it carried has already been ended by the
 * pusher as `socket_closed`, so the frames are spent whatever the holder does next.
 */
export function forgetOpenTimedAnalyticsEvents(): void {
    for (const interval of [...openIntervals]) {
        interval.socketGone();
    }
}

/**
 * A socket is back. Intervals opened with `reopenOnReconnect` start measuring again,
 * against the new socket and under a new pusher-side handle.
 *
 * This exists because a reconnect ends an interval that the user never ended. Nothing
 * fires a second "start" — the broadcast never stopped, the user is still standing in
 * the area, still sharing their screen — so without this the rest of that stay is
 * invisible for the lifetime of the tab. It used to be a boolean on AnalyticsClient
 * that did this for the megaphone alone; the other four had the same hole and nobody
 * had noticed.
 *
 * A stay spanning a reconnect therefore lands as two rows rather than one truncated
 * one. The durations still sum to the truth; the count of intervals goes up.
 */
export function resumeOpenTimedAnalyticsEvents(): void {
    for (const interval of [...openIntervals]) {
        interval.socketBack();
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
    { reopenOnReconnect = false }: { reopenOnReconnect?: boolean } = {},
): TimedAnalyticsEventHandle {
    let handle = "";
    let closed = false;
    // Whether an open frame of ours is outstanding on the CURRENT socket. It goes
    // false the moment that socket dies, without the interval being closed: the
    // pusher has ended it, but the thing being measured is still happening.
    let measuring = false;

    const emitOpen = (): void => {
        handle = `${eventName}:${uuidv4()}`;
        measuring = true;
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
    };

    const interval: SocketAwareInterval = {
        socketGone(): void {
            measuring = false;
            if (!reopenOnReconnect) {
                // Nothing will reopen it, so the holder's eventual close must be a
                // no-op rather than a frame sent over the next socket for an interval
                // the pusher already recorded — it would be dropped there as unpaired.
                closed = true;
                openIntervals.delete(interval);
            }
        },
        socketBack(): void {
            if (!closed && !measuring) {
                emitOpen();
            }
        },
    };

    openIntervals.add(interval);
    emitOpen();

    return {
        close(): void {
            if (closed) {
                return;
            }
            closed = true;
            openIntervals.delete(interval);
            if (!measuring) {
                return;
            }

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
