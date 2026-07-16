import type { AnalyticsEventReportMessage } from "@workadventure/messages";
import { v4 as uuidv4 } from "uuid";

type TimedEventProperties = Record<string, string | number | boolean | null | undefined>;

export type TimedAnalyticsEventHandle = {
    /** Idempotent: closing twice reports one interval, not two. */
    close(endReason?: string): void;
};

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
export function openTimedAnalyticsEvent(
    eventName: string,
    properties: TimedEventProperties,
    sendReport: (message: AnalyticsEventReportMessage) => void,
): TimedAnalyticsEventHandle {
    const handle = `${eventName}:${uuidv4()}`;
    let closed = false;

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
        close(endReason?: string): void {
            if (closed) {
                return;
            }
            closed = true;

            sendReport({
                events: [
                    {
                        eventName: "timed_event.close",
                        source: "front",
                        clientEventTimeMs: Date.now(),
                        eventId: `timed-close:${handle}`,
                        properties: endReason === undefined ? { handle } : { handle, endReason },
                    },
                ],
            });
        },
    };
}
