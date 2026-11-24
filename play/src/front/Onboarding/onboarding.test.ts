import { afterEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import type { OnboardingAnchor } from "@workadventure/messages";
import { decide, newState } from "./onboardingRules";
import type { OnboardingContext, OnboardingItem, OnboardingState } from "./onboardingRules";
import type { ItemRun } from "./ItemRunner";

// The runner's steps, without a DOM: each started step is recorded with its run.
const started: { anchor: string; run: ItemRun; stopped: boolean }[] = [];
vi.mock("./stepKinds", () => ({
    stepKinds: {
        popover: (step: { anchor: string }, run: ItemRun) => {
            const entry = { anchor: step.anchor, run, stopped: false };
            started.push(entry);
            return () => (entry.stopped = true);
        },
    },
}));

const visible = new Set<OnboardingAnchor>();
vi.mock("./OnboardingAnchors", () => ({
    anchorNode: (anchor: OnboardingAnchor) => (visible.has(anchor) ? document.createElement("div") : undefined),
}));

const { runItem } = await import("./ItemRunner");

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

function ctx(extra: Partial<OnboardingContext> = {}): OnboardingContext {
    return {
        now: NOW,
        tags: [],
        isGuest: false,
        isTouch: false,
        quietPeriodMinutes: 60,
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
        expect(result).toEqual({ skip: ["a"], start: undefined });
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
