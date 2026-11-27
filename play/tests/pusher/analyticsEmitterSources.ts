import { ANALYTICS_EVENT_CATALOG, timedAnalyticsEventDefinition } from "@workadventure/messages";

/**
 * The analytics event names the code sends, read off its sources. Shared by the catalog test and the onboarding wiring
 * test. Not a test file itself: it holds no `describe`.
 */

/**
 * The source of every file that names an event which ends up stored.
 *
 * Read through import.meta.glob rather than fs: Vite inlines the text at build
 * time, so this needs neither a working cwd (jsdom reports "/") nor
 * import.meta.url (it does not survive the transform).
 *
 * The whole of `src/front`, because that is where the names live now. AnalyticsClient
 * used to carry one method per event, so scraping that single file found every name;
 * those methods went into their call sites and the literals went with them. Inlining
 * ~5 MB of source into this test's bundle is what it costs to keep the two assertions
 * below — and a catalog nobody checks is worth less.
 */
export const EMITTER_SOURCES = import.meta.glob<string>(
    [
        "../../src/front/**/*.{ts,svelte}",
        // `src/front/external-modules/` is empty here and symlinked to the SaaS repo's own
        // external-modules/ when the two are checked out together. Vite refuses to inline a
        // ?raw file whose real path escapes the project root, so globbing it fails the whole
        // suite with "Denied ID" — and there is nothing to gain by reading it: the events
        // those modules emit are the ones listed in EMITTED_FROM_EXTERNAL_MODULES below.
        "!../../src/front/external-modules/**",
        "../../src/pusher/services/AnalyticsEventsQueue.ts",
    ],
    { query: "?raw", import: "default", eager: true },
);

/**
 * The pusher's queue names its events in object literals rather than through
 * `trackAdminEvent`, so it needs a pattern of its own — and that pattern has to stay
 * scoped here. Let it loose over `src/front` and it matches TimedAnalyticsEvent.ts,
 * whose `timed_event.open`/`.close` are control frames the handler intercepts and
 * never enqueues: catalogued they are not, and emitted they are not either.
 */
export const QUEUE_SOURCES = Object.entries(EMITTER_SOURCES)
    .filter(([path]) => path.includes("AnalyticsEventsQueue"))
    .map(([, source]) => source);

/**
 * Emitted from the other repository.
 *
 * The SaaS repo's `external-modules/` reaches analyticsClient for the Teams and
 * Discord integrations, and these two events have no caller on this side. Nothing
 * here can read that source, so without naming them the catalog reads as documenting
 * two dead entries.
 */
export const EMITTED_FROM_EXTERNAL_MODULES = ["external_module.opened", "external_module.chat_band.clicked"];

/**
 * Emitted from `back/`, which this glob cannot reach: it is a separate package with
 * its own tsconfig, and Vite refuses to inline `?raw` files from outside the project
 * root — the same reason `src/front/external-modules/` is excluded above.
 *
 * These are the rows the back emits as the authority on a space session — a meeting
 * or a broadcast: it owns the space, so it is the only party that can say a session
 * happened once rather than once per participant.
 * See back/src/Model/SessionAnalytics.ts.
 */
export const EMITTED_FROM_BACK = ["meeting.participation.ended"];

/**
 * The names the front asks the pusher to time, e.g. openTimedEvent("area.dwell", …).
 *
 * Both spellings: the literal used to sit on the low-level `openTimedAnalyticsEvent`
 * because one client method called it by name, and now every name is passed to
 * `openTimedEvent` from the code that owns the interval. Matching only the first is
 * how this check went vacuous the day that method left — which the size guard below
 * caught, and is the reason it is there.
 */
export function extractTimedEventRequests(): Set<string> {
    const names = new Set<string>();
    for (const source of Object.values(EMITTER_SOURCES)) {
        for (const [, name] of source.matchAll(/openTimed(?:Analytics)?Event\(\s*"([a-z][a-z0-9_.]*)"/g)) {
            names.add(name);
        }
    }

    return names;
}

/**
 * Every event name the code can actually produce.
 *
 * Regex over the sources, because the names are literals at call sites rather than
 * a registry — that is the whole reason this check has to exist. Note `\s*` after
 * the opening paren: prettier moves the name onto its own line as soon as a call
 * grows, and a regex demanding `("` silently matches almost nothing.
 */
export function extractEmittedEventNames(): Set<string> {
    // Exact, not scraped: every interval the tracker emits, plus the row some of
    // them emit when they OPEN. None of these appear as a literal at an emit site —
    // the tracker emits whatever it was asked to hold, and reads the rest off the
    // catalog entry. Sessions are the reason this covers more than the
    // client-openable set.
    const names = new Set<string>();
    for (const eventName of Object.keys(ANALYTICS_EVENT_CATALOG)) {
        const timed = timedAnalyticsEventDefinition(eventName);
        if (!timed) {
            continue;
        }
        names.add(eventName);
        if (timed.opensWith) {
            names.add(timed.opensWith);
        }
    }

    for (const name of [...EMITTED_FROM_EXTERNAL_MODULES, ...EMITTED_FROM_BACK]) {
        names.add(name);
    }

    for (const source of Object.values(EMITTER_SOURCES)) {
        for (const [, name] of source.matchAll(
            /(?:trackAdminEvent|openTimedAnalyticsEvent)\(\s*"([a-z][a-z0-9_.]*)"/g,
        )) {
            names.add(name);
        }
        // trackAdminEvent(!$mapEditorModeStore ? "map_editor.opened" : "map_editor.closed")
        for (const [, whenTrue, whenFalse] of source.matchAll(
            /trackAdminEvent\(\s*[^"()]+\?\s*"([a-z][a-z0-9_.]*)"\s*:\s*"([a-z][a-z0-9_.]*)"/g,
        )) {
            names.add(whenTrue);
            names.add(whenFalse);
        }
    }

    for (const source of QUEUE_SOURCES) {
        for (const [, name] of source.matchAll(/eventName:\s*"([a-z][a-z0-9_.]*)"/g)) {
            names.add(name);
        }
    }

    return names;
}

/**
 * The names the front's own tap can see (see `AnalyticsClient.eventNamesSent`): those its code passes to
 * `trackAdminEvent()` or `openTimedEvent()`, and the ones the SaaS external modules send through the same client.
 * Unlike `extractEmittedEventNames()`, it leaves out what only the pusher or the back emits, and the rows an interval
 * opens with, which the front never names.
 */
export function frontSentEventNames(): Set<string> {
    const names = new Set<string>([...extractTimedEventRequests(), ...EMITTED_FROM_EXTERNAL_MODULES]);
    for (const [path, source] of Object.entries(EMITTER_SOURCES)) {
        if (!path.includes("/src/front/")) {
            continue;
        }
        for (const [, name] of source.matchAll(/trackAdminEvent\(\s*"([a-z][a-z0-9_.]*)"/g)) {
            names.add(name);
        }
        for (const [, whenTrue, whenFalse] of source.matchAll(
            /trackAdminEvent\(\s*[^"()]+\?\s*"([a-z][a-z0-9_.]*)"\s*:\s*"([a-z][a-z0-9_.]*)"/g,
        )) {
            names.add(whenTrue);
            names.add(whenFalse);
        }
    }
    return names;
}
