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
import { postHogEventKey } from "@workadventure/messages/src/JsonMessages/AnalyticsPostHogKeys";
import { POSTHOG_API_KEY, POSTHOG_URL } from "../Enum/EnvironmentVariable";
import { hasCapability } from "../Connection/Capabilities";
import type { CowebsiteOpenedAnalyticsContext } from "./CowebsiteAnalyticsProperties";
import {
    buildCowebsiteOpenedProperties,
    stripUrlSensitiveParts,
    stripUrlToOrigin,
} from "./CowebsiteAnalyticsProperties";
import type { TimedAnalyticsEventHandle } from "./TimedAnalyticsEvent";
import {
    forgetOpenTimedAnalyticsEvents,
    openTimedAnalyticsEvent,
    resumeOpenTimedAnalyticsEvents,
} from "./TimedAnalyticsEvent";

type AdminAnalyticsSender = (message: AnalyticsEventReportMessage) => void;
type AdminAnalyticsEvent = AnalyticsEventReportMessage["events"][number];
type ExperienceIssueProperties = {
    category?: string;
    reason?: string;
    durationMs?: number;
    count?: number;
};

const MAX_PENDING_ADMIN_EVENTS = 100;

/** Handed back when the admin sink is off: a handle that measures nothing. */
const NO_INTERVAL: TimedAnalyticsEventHandle = { close: (): void => {} };

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
    ): TimedAnalyticsEventHandle {
        if (!this.canSendAdminAnalytics()) {
            return NO_INTERVAL;
        }

        return openTimedAnalyticsEvent(eventName, properties, this.sendTimedEventReport, options);
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

    /**
     * Opens the interval that measures one cowebsite visit, and hands it to the store.
     *
     * The store is where the pairing already lives: it holds the cowebsites, and its
     * add/keepOnly/empty are the sixteen ways one goes away. Keeping the handles here
     * meant a second, parallel record of which cowebsites were open, kept in step by
     * hand — and only for as long as someone remembered to call closedWebsite.
     */
    openedWebsite(url: URL, context: CowebsiteOpenedAnalyticsContext = {}): TimedAnalyticsEventHandle {
        // Its own capture rather than a table entry: this opens an interval the admin
        // hears about only when the cowebsite CLOSES, while PostHog has always counted
        // the opening. Origin only before it reaches PostHog too — cowebsite URLs carry
        // auth tokens in the query and the document name in the path.
        this.posthog?.capture("wa_opened_website", { url: stripUrlToOrigin(url) });

        return this.openTimedEvent("cowebsite.closed", buildCowebsiteOpenedProperties(url, context));
    }

    /**
     * A URL the scripting API put on screen somewhere the app does not own: a browser
     * tab, a navigation away, a UI panel, an in-map iframe. None of them is a
     * cowebsite, and all five used to report `cowebsite.opened` with no context —
     * landing as triggerProperty `other` and diluting every per-area cowebsite figure.
     * PostHog keeps seeing them under the same name it always has.
     */
    scriptingWebsiteOpened(url: URL): void {
        this.trackAdminEvent("scripting.website_opened", { url: stripUrlToOrigin(url) });
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
    enterArea(id: string, name: string): TimedAnalyticsEventHandle {
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
    mapLoadingStarted(mapUrl?: string): void {
        // Strip query string / fragment so map/WAM/room URLs carrying access
        // tokens are not shipped as analytics, mirroring the cowebsite URL handling.
        this.trackAdminEvent("map_loading.started", {
            mapUrl: mapUrl ? stripUrlSensitiveParts(mapUrl) : undefined,
        });
    }

    /**
     * The eight nobody calls.
     *
     * Every other single-statement method here went into its call site. These have no
     * call site to go into: no caller in this repo, and none in the SaaS one either.
     *
     * They are kept because the catalog entry is the contract rather than the caller.
     * `media.quality_issue`, `performance.issue` and `front.critical_error` are read by
     * the SaaS dashboards, which have shown zero from the day they were written because
     * nothing on this side has ever emitted them. `feedback.opened` and
     * `feedback.submitted` describe the Sentry feedback dialog, of which only the
     * external-report-URL path is wired. The last three are UI that lost its button.
     *
     * Note what keeps them upright: the catalog test scrapes the emitters for literals,
     * and this file is one of them — so an event named here reads as emitted whether or
     * not anything calls it. That is exactly why these eight were invisible until the
     * rest moved out, and why a ninth added here would be invisible too.
     */
    editEmote(): void {
        this.trackAdminEvent("emote.edit_opened");
    }

    openBackgroundSettings(): void {
        this.trackAdminEvent("settings.background.opened");
    }

    feedbackOpened(feedbackSource: "sentry" | "external_report_url" = "sentry"): void {
        this.trackAdminEvent("feedback.opened", { feedbackSource });
    }

    feedbackSubmitted(feedbackSource: "sentry" | "external_report_url" = "sentry", hasScreenshot?: boolean): void {
        this.trackAdminEvent("feedback.submitted", { feedbackSource, hasScreenshot });
    }

    selectCustomWoka(): void {
        this.trackAdminEvent("onboarding.custom_woka_selected");
    }

    mediaQualityIssue(properties: ExperienceIssueProperties = {}): void {
        this.trackAdminEvent("media.quality_issue", properties);
    }

    frontCriticalError(properties: ExperienceIssueProperties = {}): void {
        this.trackAdminEvent("front.critical_error", properties);
    }

    performanceIssue(properties: ExperienceIssueProperties = {}): void {
        this.trackAdminEvent("performance.issue", properties);
    }
}
export const analyticsClient = new AnalyticsClient();
