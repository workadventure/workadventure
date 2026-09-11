import type { PostHog } from "@posthog/types";
import type {
    AnalyticsEventArgs,
    AnalyticsEventName,
    AnalyticsEventReportMessage,
    TimedAnalyticsEventName,
    TimedAnalyticsEventOpenProperties,
} from "@workadventure/messages";
// By path rather than through the package barrel, and that is the point: this
// module's only import is a type, so what lands in the bundle is 117 strings. The
// same table used to live on the catalog entries, which pulled ~166 live Zod
// schemas into the browser to look one up.
import { postHogEventKey, postHogIntervalKeys } from "@workadventure/messages/src/JsonMessages/AnalyticsPostHogKeys";
import { POSTHOG_API_KEY, POSTHOG_URL } from "../Enum/EnvironmentVariable";
import { hasCapability } from "../Connection/Capabilities";
import type { EndTimedAnalyticsEvent } from "./TimedAnalyticsEvent";
import {
    forgetOpenTimedAnalyticsEvents,
    openTimedAnalyticsEvent,
    resumeOpenTimedAnalyticsEvents,
} from "./TimedAnalyticsEvent";

type AdminAnalyticsSender = (message: AnalyticsEventReportMessage) => void;
type AdminAnalyticsEvent = AnalyticsEventReportMessage["events"][number];

const MAX_PENDING_ADMIN_EVENTS = 100;

/** Handed back when the admin sink is off: an end that measures nothing. */
const NO_INTERVAL: EndTimedAnalyticsEvent = () => {};

/** The declared subset of an interval's properties that travels to PostHog, or all of it. */
function pick(properties: Record<string, unknown>, keys: readonly string[] | undefined): Record<string, unknown> {
    return keys === undefined
        ? properties
        : Object.fromEntries(keys.filter((key) => key in properties).map((key) => [key, properties[key]]));
}

declare global {
    interface Window {
        posthog?: PostHog;
    }
}

class AnalyticsClient {
    private isEnabled_ = false;
    private adminAnalyticsSender: AdminAnalyticsSender | undefined;
    private pendingAdminEvents: AdminAnalyticsEvent[] = [];
    private previousRoomId: string | undefined;

    constructor() {
        if ((POSTHOG_API_KEY || POSTHOG_URL) && (!POSTHOG_API_KEY || !POSTHOG_URL)) {
            console.warn("PostHog is partially configured. Analytics will not be sent.");
        }

        if (POSTHOG_API_KEY && POSTHOG_URL && !this.posthog) {
            console.warn("PostHog is configured but not initialized. Analytics will not be sent.");
        }

        this.isEnabled_ = POSTHOG_API_KEY != undefined && POSTHOG_URL != undefined;
    }

    private get posthog(): PostHog | undefined {
        return window.posthog;
    }

    public get isEnabled(): boolean {
        return this.isEnabled_;
    }

    setAdminAnalyticsSender(sender: AdminAnalyticsSender | undefined): void {
        this.adminAnalyticsSender = sender;
        if (!sender) {
            // The connection is going away (ConnectionManager clears the sender on
            // cleanup). Every interval this socket still holds open is closed by the
            // pusher itself as socket_closed, so these handles are already spent —
            // and this now says so for handles held anywhere, not just the ones
            // filed here. CoWebsiteStore keeps its own and has no idea a socket
            // exists; a later close from it is a no-op rather than an unpaired frame.
            forgetOpenTimedAnalyticsEvents();
        } else {
            // A socket is back. Whatever is still happening starts measuring again.
            resumeOpenTimedAnalyticsEvents();
        }
        this.flushPendingAdminEvents();
    }

    /**
     * The single choke point every analytics event goes through — both sinks.
     *
     * Called straight from the code that does the thing. There used to be a method
     * here per event — 133 of them, each a name and a signature wrapping this one
     * line — so reading what a button reported meant opening this file and finding
     * `menuCredit()` to learn it sends `menu.credit.opened`. The event name at the
     * point of use says that without the hop, and 133 names stopped being invented.
     *
     * Generic over the event name so the catalog checks both halves of the call: an
     * unknown name and a property the event does not declare are both compile errors
     * at the call site, rather than an event the admin silently drops months later.
     * The properties argument is optional for the bare signals, which declare none.
     *
     * PostHog is fed from the same call, by looking the event up in
     * POSTHOG_EVENT_KEYS — the only place a PostHog name is written down, bar the
     * methods left below. Those reach two PostHog names for one event, which a map
     * keyed by event cannot express, so they capture on their own line; keeping them
     * here is what keeps `posthog.capture("wa_…")` out of the call sites.
     */
    public trackAdminEvent<N extends AnalyticsEventName>(eventName: N, ...args: AnalyticsEventArgs<N>): void {
        const [properties = {}] = args;

        // Ahead of the capability gate, and deliberately: PostHog is the sink that
        // predates this pipeline, and on a world whose pusher does not advertise
        // api/analytics/events-batch it is the only one there is. Gating it on that
        // capability would switch analytics off for every such world.
        const postHogKey = postHogEventKey(eventName, properties);
        if (postHogKey) {
            this.posthog?.capture(postHogKey, properties);
        }

        if (!this.canSendAdminAnalytics()) {
            return;
        }

        const clientEventTimeMs = Date.now();
        const event = {
            eventName,
            source: "front",
            clientEventTimeMs,
            eventId: `${eventName}:${clientEventTimeMs}:${Math.random().toString(36).slice(2)}`,
            properties,
        } satisfies AdminAnalyticsEvent;

        this.dispatchAdminEvent(event);
    }

    /**
     * Opens an interval and hands the handle to the caller, who is the only one who
     * knows when the thing it measures ends.
     *
     * Always returns a handle, even when the admin sink is off, so no caller has to
     * branch on a capability it should not know about — the returned handle simply
     * measures nothing.
     */
    public openTimedEvent<N extends TimedAnalyticsEventName>(
        eventName: N,
        properties: TimedAnalyticsEventOpenProperties<N>,
        options: { reopenOnReconnect?: boolean } = {},
    ): EndTimedAnalyticsEvent {
        // Ahead of the capability gate, exactly as in trackAdminEvent and for the same
        // reason: on a world whose pusher does not advertise the batch endpoint,
        // PostHog is the only sink there is.
        const keys = postHogIntervalKeys(eventName);
        if (keys) {
            this.posthog?.capture(keys.opens, pick(properties, keys.opensProperties));
        }

        const end = this.canSendAdminAnalytics()
            ? openTimedAnalyticsEvent(eventName, properties, this.sendTimedEventReport, options)
            : NO_INTERVAL;

        if (!keys?.closes) {
            return end;
        }

        // One capture however often it is called: `end` is idempotent and PostHog has
        // to be too, or a holder that closes twice counts two.
        const closes = keys.closes;
        let captured = false;
        return () => {
            end();
            if (captured) {
                return;
            }
            captured = true;
            this.posthog?.capture(closes, pick(properties, keys.opensProperties));
        };
    }

    private dispatchAdminEvent(event: AdminAnalyticsEvent): void {
        if (!this.adminAnalyticsSender) {
            this.pendingAdminEvents.push(event);
            if (this.pendingAdminEvents.length > MAX_PENDING_ADMIN_EVENTS) {
                this.pendingAdminEvents.shift();
            }
            return;
        }

        this.adminAnalyticsSender({ events: [event] });
    }

    /**
     * Routes a timed event's control frames through the same buffer as everything
     * else, rather than straight at the sender.
     *
     * The buffer is why: before the room connection exists there is nowhere to send,
     * and an interval opened then would otherwise vanish while its close still went
     * out — the pusher drops an unpaired close, so the interval would be lost with no
     * trace. Buffered, both frames arrive in order and the pusher pairs them.
     *
     * The pusher starts timing when the open *reaches* it, so a frame that waits in
     * this buffer shortens the interval it reports. Nothing here opens an interval
     * before the connection is up (you cannot stand in an area, or share a screen, in
     * a room you have not joined), so the wait is bounded by the flush that
     * setAdminAnalyticsSender triggers. If the buffer overflows and drops an open,
     * the pusher drops the close too: a lost interval, never an invented one.
     */
    private readonly sendTimedEventReport = (message: AnalyticsEventReportMessage): void => {
        for (const event of message.events ?? []) {
            this.dispatchAdminEvent(event);
        }
    };

    private canSendAdminAnalytics(): boolean {
        return "capabilities" in window && hasCapability("api/analytics/events-batch") === "v1";
    }

    private flushPendingAdminEvents(): void {
        if (!this.adminAnalyticsSender || this.pendingAdminEvents.length === 0) {
            return;
        }

        const events = this.pendingAdminEvents;
        this.pendingAdminEvents = [];
        this.adminAnalyticsSender({ events });
    }

    identifyUser(uuid: string, email: string | null, roomId: string | null): void {
        this.posthog?.identify(uuid, { uuid, email, wa: true, roomId });
        this.trackAdminEvent("auth.user_identified", { roomId });
    }

    enteredRoom(roomId: string, roomGroup: string | null): void {
        this.trackAdminEvent("room.visited", { roomId, roomGroup });
        if (this.previousRoomId && this.previousRoomId !== roomId) {
            this.trackAdminEvent("room.changed", { fromRoomId: this.previousRoomId, toRoomId: roomId });
        }
        this.previousRoomId = roomId;
    }

    // The two ends of one broadcast, named for PostHog, which counts each press. The
    // admin gets one `megaphone.ended` row carrying the duration instead.
    //
    // The interval is the caller's: startMegaphoneLive is reachable twice without an
    // intervening stop (the modal and the action bar both lead there), and only the
    // caller can tell a second press from a second broadcast. Everything that ends a
    // broadcast goes through stopMegaphoneLive, including being kicked off the stage.
    startMegaphone(): void {
        this.posthog?.capture("wa_start_megaphone");
    }

    stopMegaphone(): void {
        this.posthog?.capture("wa_stop_megaphone");
    }

    // enterArea/leaveArea keep their own posthog.capture for the same reason megaphone
    // does: PostHog counts an enter and a leave, the admin gets one `area.dwell` row.
    enterArea(id: string, name: string): EndTimedAnalyticsEvent {
        this.posthog?.capture(`wa_map-editor_enter_area`, { id, name });

        return this.openTimedEvent("area.dwell", { areaId: id, areaName: name }, { reopenOnReconnect: true });
    }

    leaveArea(id: string, name: string): void {
        this.posthog?.capture(`wa_map-editor_leaver_area`, { id, name });
    }

    // PostHog only. `cowebsite.closed` is now the end of an interval the store opens
    // and closes, so reporting it from the close BUTTON would both duplicate it and
    // miss the fifteen other ways a cowebsite goes away.
    closeCowebsite(): void {
        this.posthog?.capture("wa_close_cowebsite");
    }
}
export const analyticsClient = new AnalyticsClient();
