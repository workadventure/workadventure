import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import { ReplaySubject, Subject } from "rxjs";
import type { OnboardingAnchor } from "@workadventure/messages";
import type { GameScene } from "../Phaser/Game/GameScene";
import { decide, newState } from "./onboardingRules";
import type { OnboardingContext, OnboardingItem, OnboardingState, OnboardingStep, Reason } from "./onboardingRules";
import type { ItemRun } from "./ItemRunner";
import type { HelpItem } from "./OnboardingScheduler";

// The runner's steps, without a DOM: each started step is recorded with its run.
const started: { anchor: string; run: ItemRun; stopped: boolean }[] = [];
vi.mock("./stepKinds", () => ({
    startStep: (step: OnboardingStep, run: ItemRun) => {
        const entry = { anchor: step.type === "popover" ? step.anchor : step.type, run, stopped: false };
        started.push(entry);
        return () => (entry.stopped = true);
    },
}));

const visible = new Set<OnboardingAnchor>();
vi.mock("./OnboardingAnchors", () => ({
    anchorNode: (anchor: OnboardingAnchor) => (visible.has(anchor) ? document.createElement("div") : undefined),
    anchorsChanged: writable(0),
    anchorClicked: new Subject(),
    anchorUsed: new Subject(),
}));
// A new subject in each scheduler test: the client sends each name once per page load.
const analytics = vi.hoisted(() => ({
    trackAdminEvent: vi.fn(),
    eventNamesSent: undefined as unknown as ReplaySubject<string>,
}));
vi.mock("../Administration/AnalyticsClient", () => ({ analyticsClient: analytics }));
vi.mock("../Connection/LocalUserStore", () => ({ localUserStore: { isLogged: () => true } }));
vi.mock("../Touch/TouchScreenManager", () => ({ touchScreenManager: { primaryTouchDevice: false } }));

const { runItem } = await import("./ItemRunner");
const { anchorsChanged, anchorUsed } = await import("./OnboardingAnchors");
const { OnboardingScheduler, groupHelpItems } = await import("./OnboardingScheduler");

const NOW = new Date(2026, 10, 24, 12, 0);

function tour(id: string, extra: Partial<OnboardingItem> = {}): OnboardingItem {
    return {
        id,
        kind: "tour",
        title: () => id,
        steps: [{ type: "popover", anchor: "actionBar.mapMenu", text: () => "" }],
        ...extra,
    };
}

function announcement(id: string): OnboardingItem {
    return { id, kind: "announcement", title: () => id, steps: [{ type: "modal", text: () => "" }] };
}

function ctx(extra: Partial<OnboardingContext> = {}): OnboardingContext {
    return {
        now: NOW,
        tags: [],
        isGuest: false,
        isTouch: false,
        quietPeriodMinutes: 60,
        startDelayOver: true,
        anchorVisible: (anchor) => anchor === "actionBar.mapMenu",
        ...extra,
    };
}

function state(extra: Partial<OnboardingState> = {}): OnboardingState {
    return { ...newState(NOW), ...extra };
}

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

describe("decide", () => {
    it("starts the first item that applies, in priority order", () => {
        expect(decide([tour("a"), tour("b")], state(), ctx()).start?.id).toBe("a");
        expect(
            decide([tour("a"), tour("b")], state({ items: { a: { status: "done", at: hoursAgo(1) } } }), ctx()).start
                ?.id,
        ).toBe("b");
    });

    it("counts days from the first visit", () => {
        const item = tour("a", { when: { minDaysSinceFirstVisit: 1, maxDaysSinceFirstVisit: 3 } });
        expect(decide([item], state(), ctx()).start).toBeUndefined();
        expect(decide([item], state({ firstVisit: "2026-11-23" }), ctx()).start?.id).toBe("a");
        expect(decide([item], state({ firstVisit: "2026-11-20" }), ctx()).start).toBeUndefined();
    });

    it("waits for the first target to be on screen, and for onAnchor", () => {
        expect(decide([tour("a")], state(), ctx({ anchorVisible: () => false })).start).toBeUndefined();
        const onAnchor = tour("a", { when: { onAnchor: "actionBar.lockBubble" } });
        expect(decide([onAnchor], state(), ctx()).start).toBeUndefined();
        expect(decide([onAnchor], state(), ctx({ anchorVisible: () => true })).start?.id).toBe("a");
    });

    it("filters on the audience", () => {
        expect(decide([tour("a", { audience: { tags: ["admin"] } })], state(), ctx()).start).toBeUndefined();
        expect(
            decide([tour("a", { audience: { tags: ["admin"] } })], state(), ctx({ tags: ["admin"] })).start?.id,
        ).toBe("a");
        expect(
            decide([tour("a", { audience: { excludeTags: ["member"] } })], state(), ctx({ tags: ["member"] })).start,
        ).toBeUndefined();
        expect(decide([tour("a", { audience: { guests: true } })], state(), ctx()).start).toBeUndefined();
        expect(
            decide([tour("a", { audience: { touch: false } })], state(), ctx({ isTouch: true })).start,
        ).toBeUndefined();
        const allowed = writable(false);
        expect(decide([tour("a", { audience: { allowed } })], state(), ctx()).start).toBeUndefined();
        allowed.set(true);
        expect(decide([tour("a", { audience: { allowed } })], state(), ctx()).start?.id).toBe("a");
    });

    it("starts nothing during the quiet period or after an opt-out", () => {
        expect(decide([tour("a")], state({ lastAutoStartAt: hoursAgo(0.5) }), ctx()).start).toBeUndefined();
        expect(decide([tour("a")], state({ lastAutoStartAt: hoursAgo(2) }), ctx()).start?.id).toBe("a");
        expect(
            decide([tour("a")], state({ lastAutoStartAt: hoursAgo(0.5) }), ctx({ quietPeriodMinutes: 0 })).start?.id,
        ).toBe("a");
        expect(decide([tour("a")], state({ optedOut: true }), ctx()).start).toBeUndefined();
    });

    it("after Stop showing tips, passes over the tips but still starts the announcements", () => {
        const optedOut = state({ optedOut: true });
        expect(decide([tour("a"), announcement("wa.announcement.v1")], optedOut, ctx()).start?.id).toBe(
            "wa.announcement.v1",
        );
        expect(decide([tour("a"), announcement("world-news")], optedOut, ctx()).start?.id).toBe("world-news");
        // A tip that will not start by itself does not hold back the world's announcement after it.
        const after = { ...announcement("world-news"), when: { after: "a" } };
        expect(decide([tour("a"), after], optedOut, ctx()).start?.id).toBe("world-news");
        // Nothing is recorded for a tip, even one about something already used.
        const used = tour("a", {
            steps: [{ type: "popover", anchor: "actionBar.chat", skipIfUsed: "actionBar.chat", text: () => "" }],
        });
        expect(decide([used], state({ optedOut: true, used: ["actionBar.chat"] }), ctx())).toEqual({
            skip: [],
            start: undefined,
            reasons: { a: "optedOut" },
        });
    });

    it("waits for `after`, with its delay", () => {
        const b = tour("b", { when: { after: { item: "a", minHours: 4 } } });
        expect(decide([tour("a", { audience: { tags: ["x"] } }), b], state(), ctx({ tags: ["x"] })).start?.id).toBe(
            "a",
        );
        expect(
            decide([b], state({ items: { a: { status: "dismissed", at: hoursAgo(1) } } }), ctx()).start,
        ).toBeUndefined();
        expect(decide([b], state({ items: { a: { status: "dismissed", at: hoursAgo(5) } } }), ctx()).start?.id).toBe(
            "b",
        );
    });

    it("does not let an item that can never apply hold back the ones after it", () => {
        const b = tour("b", { when: { after: "a" } });
        // No source has "a", its audience excludes the user, or it expired.
        expect(decide([b], state(), ctx()).start?.id).toBe("b");
        expect(decide([tour("a", { audience: { tags: ["admin"] } }), b], state(), ctx()).start?.id).toBe("b");
        expect(decide([tour("a", { when: { expiresAt: "2026-01-01" } }), b], state(), ctx()).start?.id).toBe("b");
    });

    it("records as skipped an item whose every step is about something already used, even in the quiet period", () => {
        const item = tour("a", {
            steps: [
                { type: "popover", anchor: "actionBar.lockBubble", skipIfUsed: "actionBar.lockBubble", text: () => "" },
            ],
        });
        const result = decide([item], state({ used: ["actionBar.lockBubble"], lastAutoStartAt: hoursAgo(0) }), ctx());
        expect(result).toEqual({ skip: ["a"], start: undefined, reasons: { a: "used" } });
    });

    it("holds tours back until the start delay is over, but not announcements or the tutorial", () => {
        const notYet = ctx({ startDelayOver: false });
        expect(decide([tour("a")], state(), notYet).start).toBeUndefined();
        expect(decide([tour("a"), announcement("b")], state(), notYet).start?.id).toBe("b");
        const tutorial = { ...announcement("t"), kind: "tutorial" as const };
        expect(decide([tutorial], state(), notYet).start?.id).toBe("t");
        // The quiet period still applies.
        expect(decide([announcement("b")], state({ lastAutoStartAt: hoursAgo(0.5) }), notYet).start).toBeUndefined();
    });

    it("starts the first pending announcement and skips the others", () => {
        const result = decide([announcement("a"), tour("t"), announcement("b")], state(), ctx());
        expect(result).toEqual({
            skip: ["b"],
            start: expect.objectContaining({ id: "a" }),
            reasons: { a: "starts", t: "anotherItemStarts", b: "laterAnnouncement" },
        });
        // Nothing starts in the quiet period, so nothing is skipped either.
        expect(decide([announcement("a"), announcement("b")], state({ lastAutoStartAt: hoursAgo(0) }), ctx())).toEqual({
            skip: [],
            start: undefined,
            reasons: { a: "quietPeriod", b: "quietPeriod" },
        });
    });

    it("never starts a draft, and does not let it hold back the items after it", () => {
        const draft = tour("a", { published: false });
        expect(decide([draft], state(), ctx({ tags: ["admin"] })).start).toBeUndefined();
        expect(decide([draft, tour("b", { when: { after: "a" } })], state(), ctx()).start?.id).toBe("b");
    });

    it("skips an item that `doneWhen` already says is done", () => {
        const item = { ...announcement("a"), doneWhen: writable(true) };
        expect(decide([item], state(), ctx())).toEqual({
            skip: ["a"],
            start: undefined,
            reasons: { a: "doneAlready" },
        });
    });
});

describe("decide, with used events and reasons", () => {
    it("skips an item whose item-level skipIfUsed was used, even in the quiet period", () => {
        const item = tour("a", { skipIfUsed: ["chat.matrix_folder.created"] });
        const used = state({ used: ["chat.matrix_folder.created"], lastAutoStartAt: hoursAgo(0) });
        expect(decide([item], used, ctx())).toMatchObject({ skip: ["a"], start: undefined, reasons: { a: "used" } });
        expect(decide([item], state(), ctx()).start?.id).toBe("a");
    });

    it("looks at a tip interrupted twice after every other item", () => {
        const interrupted = state({ interrupted: { a: 2 } });
        expect(decide([tour("a"), tour("b")], interrupted, ctx())).toMatchObject({
            start: { id: "b" },
            reasons: { a: "demoted", b: "starts" },
        });
        // Nothing else can start: it does, and it is never recorded as skipped.
        const bSeen = state({ interrupted: { a: 2 }, items: { b: { status: "done", at: hoursAgo(1) } } });
        expect(decide([tour("a"), tour("b")], bSeen, ctx())).toMatchObject({ skip: [], start: { id: "a" } });
    });

    // Keyed by `Reason`: a reason without a case does not compile. Item "x" gets the reason.
    const cases: Record<Reason, [OnboardingItem[], Partial<OnboardingState>, Partial<OnboardingContext>]> = {
        seen: [[tour("x")], { items: { x: { status: "done", at: hoursAgo(1) } } }, {}],
        optedOut: [[tour("x")], { optedOut: true }, {}],
        unpublished: [[tour("x", { published: false })], {}, {}],
        notInAudience: [[tour("x", { audience: { tags: ["admin"] } })], {}, {}],
        expired: [[tour("x", { when: { expiresAt: "2026-01-01" } })], {}, {}],
        tooEarly: [[tour("x", { when: { minDaysSinceFirstVisit: 1 } })], {}, {}],
        tooLate: [[tour("x", { when: { maxDaysSinceFirstVisit: 1 } })], { firstVisit: "2026-11-20" }, {}],
        waitingForAfter: [[tour("a"), tour("x", { when: { after: "a" } })], {}, {}],
        onAnchorNotOnScreen: [[tour("x", { when: { onAnchor: "actionBar.lockBubble" } })], {}, {}],
        used: [[tour("x", { skipIfUsed: ["actionBar.chat"] })], { used: ["actionBar.chat"] }, {}],
        doneAlready: [[tour("x", { doneWhen: writable(true) })], {}, {}],
        laterAnnouncement: [[announcement("a"), announcement("x")], {}, {}],
        anotherItemStarts: [[tour("a"), tour("x")], {}, {}],
        demoted: [[tour("x"), tour("a")], { interrupted: { x: 2 } }, {}],
        quietPeriod: [[tour("x")], { lastAutoStartAt: hoursAgo(0) }, {}],
        startDelay: [[tour("x")], {}, { startDelayOver: false }],
        firstAnchorNotOnScreen: [[tour("x")], {}, { anchorVisible: () => false }],
        starts: [[tour("x")], {}, {}],
    };
    it.each(Object.entries(cases))("gives each item one reason: %s", (reason, [items, extra, context]) => {
        const { reasons } = decide(items, state(extra), ctx(context));
        expect(reasons.x).toBe(reason);
        expect(Object.keys(reasons).sort()).toEqual(items.map((item) => item.id).sort());
    });
});

describe("groupHelpItems", () => {
    const listed = (id: string, group: HelpItem["group"], seen = false): HelpItem => ({ item: tour(id), group, seen });

    it("puts the world's items first, then the groups in their order, the unseen items first, and no empty group", () => {
        const grouped = groupHelpItems([
            listed("wa.conversation.a", "conversation", true),
            listed("wa.mapEditor.b", "mapEditor"),
            listed("wa.conversation.c", "conversation"),
            listed("world-item", "world", true),
            listed("wa.tutorial", "tutorial"),
            listed("wa.conversation.d", "conversation", true),
        ]);
        expect(grouped.map(({ group, items }) => [group, items.map(({ item }) => item.id)])).toEqual([
            ["world", ["world-item"]],
            ["tutorial", ["wa.tutorial"]],
            // Unseen first, then the priority order.
            ["conversation", ["wa.conversation.c", "wa.conversation.a", "wa.conversation.d"]],
            ["mapEditor", ["wa.mapEditor.b"]],
        ]);
    });
});

describe("runItem", () => {
    afterEach(() => {
        started.length = 0;
        visible.clear();
    });

    const threeSteps = tour("t", {
        steps: [
            { type: "popover", anchor: "actionBar.mapMenu", advance: "click", text: () => "" },
            { type: "popover", anchor: "mapMenu.editMap", advance: "click", text: () => "" },
            { type: "popover", anchor: "mapEditor.entityList", text: () => "" },
        ],
    });

    function run(item: OnboardingItem, used: string[] = []) {
        const ends: [string, number][] = [];
        const stop = runItem(item, {
            used: () => used,
            onStart: () => {},
            onAnchorMissing: () => {},
            onOptOut: () => {},
            onEnd: (outcome, step) => ends.push([outcome, step]),
        });
        return { ends, stop };
    }

    it("goes through the steps and ends as done", () => {
        const { ends } = run(threeSteps);
        started[0].run.complete();
        started[1].run.complete();
        expect(started.map((s) => s.anchor)).toEqual(["actionBar.mapMenu", "mapMenu.editMap", "mapEditor.entityList"]);
        expect(started[1].stopped).toBe(true);
        started[2].run.complete();
        expect(ends).toEqual([["done", 2]]);
    });

    it("jumps over the steps about something already used", () => {
        const item = tour("t", {
            steps: [{ ...threeSteps.steps[0], skipIfUsed: "actionBar.mapMenu" }, threeSteps.steps[1]],
        });
        run(item, ["actionBar.mapMenu"]);
        expect(started.map((s) => s.anchor)).toEqual(["mapMenu.editMap"]);
    });

    it("jumps over a step whose skipIfUsed names an analytics event the user sent", () => {
        const item = tour("t", {
            steps: [{ ...threeSteps.steps[0], skipIfUsed: "chat.matrix_folder.created" }, threeSteps.steps[1]],
        });
        run(item, ["chat.matrix_folder.created"]);
        expect(started.map((s) => s.anchor)).toEqual(["mapMenu.editMap"]);
    });

    it("goes back to the latest earlier step on screen when the target goes away", () => {
        const { ends } = run(threeSteps);
        started[0].run.complete();
        // The user closed the menu: the Tools button is still there.
        visible.add("actionBar.mapMenu");
        started[1].run.back();
        expect(started[2].anchor).toBe("actionBar.mapMenu");
        // Nothing earlier on screen: the item stops without a record.
        visible.clear();
        started[2].run.complete();
        started[3].run.back();
        expect(ends).toEqual([["interrupted", 1]]);
    });

    it("ends as done when doneWhen turns true, and runs what the steps left for the end", () => {
        const doneWhen = writable(false);
        const cleanup = vi.fn();
        const { ends } = run({ ...threeSteps, doneWhen });
        started[0].run.onEnd(cleanup);
        doneWhen.set(true);
        expect(ends).toEqual([["done", 0]]);
        expect(started[0].stopped).toBe(true);
        expect(cleanup).toHaveBeenCalledOnce();
    });

    it("dismisses on Esc, whatever the step", () => {
        const { ends } = run(threeSteps);
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(ends).toEqual([["dismissed", 0]]);
        // Gone with the item.
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(ends).toHaveLength(1);
    });

    it("offers Stop showing tips in a tip only", () => {
        const runs = [
            run(tour("t")),
            run(announcement("a")),
            run({ ...announcement("wa.tutorial"), kind: "tutorial" }),
        ];
        expect(started.map((step) => step.run.optOut !== undefined)).toEqual([true, false, false]);
        for (const { stop } of runs) {
            stop();
        }
    });

    it("ignores a late call from a step that is gone", () => {
        const { ends } = run(threeSteps);
        started[0].run.complete();
        started[0].run.complete();
        started[0].run.dismiss();
        expect(started).toHaveLength(2);
        started[1].run.dismiss();
        expect(ends).toEqual([["dismissed", 1]]);
    });
});

describe("OnboardingScheduler", () => {
    const tutorial: OnboardingItem = { ...announcement("wa.tutorial"), kind: "tutorial" };
    const items = [tutorial, announcement("wa.news")];
    let scheduler: InstanceType<typeof OnboardingScheduler> | undefined;

    /** A scene with only what the scheduler reads: the player variables. */
    function start(variables: Record<string, unknown>, list = items) {
        const map = new Map(Object.entries(variables));
        const scene = {
            connection: { getAllTags: () => [] },
            getPlayerVariablesManager: () => ({
                variables: map,
                setVariableFromApp: (key: string, value: unknown) => map.set(key, value),
            }),
        } as unknown as GameScene;
        const created = new OnboardingScheduler(scene, list);
        scheduler = created;
        return { map, scheduler: created, state: () => map.get("onboarding") as OnboardingState };
    }

    beforeEach(() => {
        started.length = 0;
        analytics.eventNamesSent = new ReplaySubject<string>(Number.POSITIVE_INFINITY);
        analytics.trackAdminEvent.mockClear();
    });
    afterEach(() => {
        scheduler?.destroy();
        vi.useRealTimers();
        vi.restoreAllMocks();
        visible.clear();
    });

    it("gives a new user the tutorial at once, and none of the announcements that exist then", () => {
        const { state } = start({});
        expect(state().items["wa.news"]?.status).toBe("skipped");
        expect(started).toHaveLength(1);
        expect(state().lastAutoStartAt).toBeDefined();
    });

    it("counts tutorialDone as the tutorial done, and shows an existing user the announcement", () => {
        const { state } = start({ tutorialDone: true });
        expect(state().items["wa.tutorial"]?.status).toBe("done");
        expect(state().items["wa.news"]).toBeUndefined();
        // The announcement, at once: it does not wait for the start delay.
        expect(started).toHaveLength(1);
    });

    it("lists in the Help menu the items that cannot start now, with their missing target", () => {
        const lockTip = tour("lock", {
            steps: [{ type: "popover", anchor: "actionBar.lockBubble", text: () => "" }],
        });
        const help = new OnboardingScheduler(
            {
                connection: { getAllTags: () => [] },
                getPlayerVariablesManager: () => undefined,
            } as unknown as GameScene,
            // Out of this user's audience: never listed.
            [tutorial, lockTip, tour("admins", { audience: { tags: ["admin"] } })],
        );
        scheduler = help;
        const list = () => help.helpItems.map(({ item, missingAnchor }) => [item.id, missingAnchor]);
        // The lock button is only there in a bubble.
        expect(list()).toEqual([
            ["wa.tutorial", undefined],
            ["lock", "actionBar.lockBubble"],
        ]);
        visible.add("actionBar.lockBubble");
        expect(list()).toEqual([
            ["wa.tutorial", undefined],
            ["lock", undefined],
        ]);
        visible.clear();
    });

    it("gives each item of the Help menu its group and whether it was seen", () => {
        const at = new Date().toISOString();
        const onboarding: OnboardingState = {
            firstVisit: "2026-11-24",
            items: { "wa.tutorial": { status: "done", at }, "wa.news": { status: "dismissed", at } },
            used: [],
        };
        const { scheduler: help } = start({ tutorialDone: true, onboarding }, [
            ...items,
            tour("wa.conversation.lockBubble"),
            tour("acme-tour"),
        ]);
        expect(help.helpItems.map(({ item, group, seen }) => [item.id, group, seen])).toEqual([
            ["wa.tutorial", "tutorial", true],
            // A built-in group this release does not list goes with the world's items.
            ["wa.news", "world", true],
            ["wa.conversation.lockBubble", "conversation", false],
            ["acme-tour", "world", false],
        ]);
    });

    it("lists a draft in the Help menu for world admins only, whatever its audience, and never starts it", () => {
        const draft: OnboardingItem = { ...announcement("draft"), published: false, audience: { tags: ["member"] } };
        const listed = (tags: string[]) => {
            const help = new OnboardingScheduler(
                {
                    connection: { getAllTags: () => tags },
                    getPlayerVariablesManager: () => undefined,
                } as unknown as GameScene,
                [draft],
            );
            const ids = help.helpItems.map(({ item }) => item.id);
            help.destroy();
            return ids;
        };
        expect(listed(["member"])).toEqual([]);
        expect(listed(["admin"])).toEqual(["draft"]);
        expect(started).toHaveLength(0);
        // Not news yet for a new user: it will be once the world publishes it.
        const { state } = start({}, [tutorial, draft]);
        expect(state().items.draft).toBeUndefined();
    });

    it("starts an item asked for in the Help menu as soon as its target shows up, whatever its state", () => {
        const lockTip = tour("lock", {
            steps: [{ type: "popover", anchor: "actionBar.lockBubble", text: () => "" }],
        });
        const at = new Date().toISOString();
        const onboarding: OnboardingState = {
            firstVisit: "2026-11-24",
            // Dismissed: it would never start by itself again.
            items: { "wa.news": { status: "done", at }, lock: { status: "dismissed", at } },
            used: [],
        };
        const { state, scheduler: help } = start({ tutorialDone: true, onboarding }, [...items, lockTip]);
        expect(started).toHaveLength(0);

        // Twice cancels.
        help.toggleRequest("lock");
        help.toggleRequest("lock");
        expect(state().requested).toBeUndefined();

        help.toggleRequest("lock");
        expect(state().requested).toEqual(["lock"]);
        expect(help.helpItems.find(({ item }) => item.id === "lock")?.requested).toBe(true);
        expect(started).toHaveLength(0);

        // In a bubble, the lock button shows up.
        visible.add("actionBar.lockBubble");
        anchorsChanged.update((n) => n + 1);
        expect(started.map((step) => step.anchor)).toEqual(["actionBar.lockBubble"]);
        expect(state().requested).toBeUndefined();
        visible.clear();
    });

    it("records each anchor the user uses once, a click or a shortcut alike", () => {
        const { state } = start({ tutorialDone: true });
        anchorUsed.next("actionBar.chat");
        anchorUsed.next("actionBar.chat");
        expect(state().used).toEqual(["actionBar.chat"]);
    });

    it("turns tips back on from the Help menu after Stop showing tips", () => {
        vi.useFakeTimers();
        visible.add("actionBar.mapMenu");
        const at = new Date().toISOString();
        const onboarding: OnboardingState = {
            firstVisit: "2026-11-24",
            optedOut: true,
            items: { "wa.tutorial": { status: "done", at }, "wa.news": { status: "done", at } },
            used: [],
        };
        const { state, scheduler: help } = start({ tutorialDone: true, onboarding }, [...items, tour("tip")]);
        // The start delay (30 s in tests) is over and the tip's target is on screen, but it does not start by itself.
        vi.advanceTimersByTime(30_000);
        expect(help.showTips).toBe(false);
        expect(started).toHaveLength(0);

        help.setShowTips(true);
        expect(state().optedOut).toBeUndefined();
        expect(started.map((step) => step.anchor)).toEqual(["actionBar.mapMenu"]);

        help.setShowTips(false);
        expect(state().optedOut).toBe(true);
    });

    it("leaves a stored state it cannot read as it is, and works on a fresh one in memory", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const stored = { firstVisit: "a later format" };
        const setVariableFromApp = vi.fn();
        const variables = new Map<string, unknown>([["onboarding", stored]]);
        const scene = {
            connection: { getAllTags: () => [] },
            getPlayerVariablesManager: () => ({ variables, setVariableFromApp }),
        } as unknown as GameScene;
        // A tutorial that `doneWhen` skips at once: `evaluate()` records it, then calls itself, and must see the skip.
        scheduler = new OnboardingScheduler(scene, [
            { ...tutorial, doneWhen: writable(true) },
            announcement("wa.news"),
        ]);
        expect(started).toHaveLength(0);
        expect(setVariableFromApp).not.toHaveBeenCalled();
        expect(variables.get("onboarding")).toBe(stored);
        expect(warn).toHaveBeenCalledOnce();
    });

    it("still counts tutorialDone as the tutorial done when the stored state cannot be read", () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const { map } = start({ tutorialDone: true, onboarding: { firstVisit: "a later format" } });
        // The tutorial does not start again; the announcement, for an existing user, does.
        expect(started.map((step) => step.anchor)).toEqual(["modal"]);
        expect(map.get("onboarding")).toEqual({ firstVisit: "a later format" });
    });

    /** A user who saw the tutorial and the news: what the test adds is all that can start. */
    function seenAll(extra: Partial<OnboardingState> = {}): OnboardingState {
        const at = new Date().toISOString();
        return {
            firstVisit: "2026-11-24",
            items: { "wa.tutorial": { status: "done", at }, "wa.news": { status: "done", at } },
            used: [],
            ...extra,
        };
    }

    it("records an event an item names, even one sent before the scheduler exists, and no other event", () => {
        analytics.eventNamesSent.next("chat.matrix_folder.created");
        analytics.eventNamesSent.next("bubble.say.opened");
        const tip = tour("tip", { skipIfUsed: ["chat.matrix_folder.created"] });
        const { state } = start({ tutorialDone: true, onboarding: seenAll() }, [...items, tip]);
        expect(state().used).toEqual(["chat.matrix_folder.created"]);
        // Skipped at once, without waiting for the start delay.
        expect(state().items.tip?.status).toBe("skipped");
    });

    it("ends a running tip as done when the user does what it is about", () => {
        vi.useFakeTimers();
        visible.add("actionBar.mapMenu");
        const tip = tour("tip", { skipIfUsed: ["chat.matrix_folder.created"] });
        const { state } = start({ tutorialDone: true, onboarding: seenAll() }, [...items, tip]);
        vi.advanceTimersByTime(30_000);
        expect(started.map((step) => step.anchor)).toEqual(["actionBar.mapMenu"]);

        analytics.eventNamesSent.next("chat.matrix_folder.created");
        expect(state().items.tip?.status).toBe("done");
        expect(analytics.trackAdminEvent).toHaveBeenCalledWith(
            "onboarding.item_done",
            expect.objectContaining({ itemId: "tip" }),
        );
    });

    it("puts a tip interrupted twice after the others, and keeps it", () => {
        vi.useFakeTimers();
        visible.add("actionBar.mapMenu");
        visible.add("actionBar.chat");
        const other = tour("b", { steps: [{ type: "popover", anchor: "actionBar.chat", text: () => "" }] });
        const { state } = start({ tutorialDone: true, onboarding: seenAll() }, [...items, tour("a"), other]);
        vi.advanceTimersByTime(30_000);
        // Its target goes away twice while it shows (a bubble that closes, say).
        started.at(-1)?.run.back();
        expect(state().interrupted).toEqual({ a: 1 });
        vi.advanceTimersByTime(61 * 60_000);
        expect(started.at(-1)?.anchor).toBe("actionBar.mapMenu");
        started.at(-1)?.run.back();
        expect(state().interrupted).toEqual({ a: 2 });

        vi.advanceTimersByTime(61 * 60_000);
        expect(started.at(-1)?.anchor).toBe("actionBar.chat");
        expect(state().items.a).toBeUndefined();
    });

    it("does not count an interruption by the Help menu, nor one of the tutorial", () => {
        vi.useFakeTimers();
        visible.add("actionBar.mapMenu");
        const { state, scheduler: help } = start({ tutorialDone: true, onboarding: seenAll() }, [
            ...items,
            tour("a"),
            tour("b"),
        ]);
        vi.advanceTimersByTime(30_000);
        help.startFromHelp("b");
        expect(state().interrupted).toBeUndefined();
        help.destroy();

        const { state: newUser, scheduler: withTutorial } = start({});
        withTutorial.destroy();
        expect(newUser().interrupted).toBeUndefined();
    });

    it("forgets the interruptions of a tip once it ends done or dismissed", () => {
        vi.useFakeTimers();
        visible.add("actionBar.mapMenu");
        const { state } = start({ tutorialDone: true, onboarding: seenAll({ interrupted: { a: 1 } }) }, [
            ...items,
            tour("a"),
        ]);
        vi.advanceTimersByTime(30_000);
        started.at(-1)?.run.dismiss();
        expect(state().items.a?.status).toBe("dismissed");
        expect(state().interrupted).toBeUndefined();
    });

    it("sends onboarding.opted_out from a tip, and from the Help menu when tips were on", () => {
        vi.useFakeTimers();
        visible.add("actionBar.mapMenu");
        const { scheduler: help } = start({ tutorialDone: true, onboarding: seenAll() }, [...items, tour("a")]);
        vi.advanceTimersByTime(30_000);
        started.at(-1)?.run.optOut?.();
        expect(analytics.trackAdminEvent).toHaveBeenCalledWith("onboarding.opted_out", {
            from: "tip",
            itemId: "a",
            source: "world",
            step: 0,
        });

        analytics.trackAdminEvent.mockClear();
        // Already off: nothing to count.
        help.setShowTips(false);
        expect(analytics.trackAdminEvent).not.toHaveBeenCalledWith("onboarding.opted_out", expect.anything());
        help.setShowTips(true);
        help.setShowTips(false);
        expect(analytics.trackAdminEvent).toHaveBeenCalledWith("onboarding.opted_out", { from: "help" });
    });

    it("writes tutorialDone when the tutorial ends, for map scripts", () => {
        const { map } = start({});
        started[0].run.dismiss();
        expect(map.get("tutorialDone")).toBe(true);
    });
});
