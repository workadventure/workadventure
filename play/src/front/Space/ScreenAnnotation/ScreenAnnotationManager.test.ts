import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";
import type { Writable } from "svelte/store";
import { Subject } from "rxjs";
import type { ScreenAnnotationElement, ScreenAnnotationEvent } from "@workadventure/messages";
import type { SpaceState } from "@workadventure/shared-utils";
import type { SpaceInterface } from "../SpaceInterface";
import type { Streamable } from "../Streamable";
import {
    localAnnotationTargetStore,
    screenAnnotationElementsStore,
    screenAnnotationFinishedCountStore,
    screenAnnotationEnabledStore,
} from "../../Stores/ScreenAnnotationStore";

const sharing = vi.hoisted(() => ({
    state: undefined as unknown as Writable<boolean>,
    source: undefined as unknown as Writable<{ id: string } | undefined>,
}));
vi.mock("../../Stores/ScreenSharingStore", async () => {
    const { writable } = await import("svelte/store");
    sharing.state = writable(false);
    sharing.source = writable(undefined);
    return { requestedScreenSharingState: sharing.state, activeScreenShareSourceStore: sharing.source };
});

import { screenAnnotationManager } from "./ScreenAnnotationManager";

const PRESENTER = "presenter";
const ME = "me";

const events = new Subject<{ sender: string; screenAnnotation: ScreenAnnotationEvent }>();
const userLeft = new Subject<{ spaceUserId: string }>();
const emitPublicMessage = vi.fn();
const annotations = writable<SpaceState["annotations"]>({});
const stateManager = {
    observe: () => annotations,
    upsertScreenAnnotation: vi.fn(() => Promise.resolve()),
    removeScreenAnnotation: vi.fn(() => Promise.resolve()),
    clearScreenAnnotations: vi.fn(() => Promise.resolve()),
};
const space = {
    mySpaceUserId: ME,
    state: stateManager,
    observePublicEvent: () => events,
    observeUserLeft: userLeft,
    onLeaveSpace: new Subject<void>(),
    emitPublicMessage,
} as unknown as SpaceInterface;

function element(id: string, authorUserId: string): ScreenAnnotationElement {
    return { id, authorUserId, tool: "pen", color: "#fff", width: 0.01, points: [{ x: 0, y: 0 }] };
}

function setState(othersAllowed: boolean, ...elements: ScreenAnnotationElement[]) {
    annotations.set({
        [PRESENTER]: {
            othersAllowed,
            elements: Object.fromEntries(elements.map((e) => [e.id, { ...e, tool: "pen" as const, at: 0 }])),
        },
    });
}

function sendDraft(sender: string, draft: ScreenAnnotationElement) {
    events.next({ sender, screenAnnotation: { targetUserId: PRESENTER, operation: { $case: "draft", draft } } });
}

function elementIds(target = PRESENTER) {
    return (get(screenAnnotationElementsStore).get(target) ?? []).map((e) => e.id);
}

describe("ScreenAnnotationManager", () => {
    afterEach(() => {
        screenAnnotationManager.unbind();
        vi.useRealTimers();
    });

    it("shows concurrent pointers temporarily and never commits them", () => {
        vi.useFakeTimers();
        setState(true);
        const pointer = { ...element("p", "viewer"), tool: "pointer" };
        sendDraft("viewer", pointer);
        sendDraft("other", { ...pointer, id: "q" });
        expect(elementIds()).toEqual(["p", "q"]);
        vi.advanceTimersByTime(1000);
        sendDraft("viewer", pointer);
        vi.advanceTimersByTime(501);
        expect(elementIds()).toEqual(["p"]);
        vi.advanceTimersByTime(1000);
        expect(elementIds()).toEqual([]);
        stateManager.upsertScreenAnnotation.mockClear();
        screenAnnotationManager.upsertElement(PRESENTER, pointer);
        expect(stateManager.upsertScreenAnnotation).not.toHaveBeenCalled();
    });

    it("rejects unauthorized or invalid pointers and clears them when permission is revoked", () => {
        const pointer = { ...element("p", "viewer"), tool: "pointer" };
        sendDraft("viewer", pointer);
        expect(elementIds()).toEqual([]);
        setState(true);
        sendDraft("viewer", { ...pointer, points: [{ x: NaN, y: 0 }] });
        expect(elementIds()).toEqual([]);
        sendDraft("viewer", pointer);
        expect(elementIds()).toEqual(["p"]);
        setState(false);
        expect(elementIds()).toEqual([]);
    });

    beforeEach(() => {
        sharing.source.set(undefined);
        sharing.state.set(false);
        annotations.set({});
        emitPublicMessage.mockClear();
        stateManager.clearScreenAnnotations.mockClear();
        stateManager.upsertScreenAnnotation.mockClear();
        stateManager.removeScreenAnnotation.mockClear();
        screenAnnotationManager.bindToSpace(space, new Subject<Streamable>());
    });

    it("publishes the finished elements and the setting of the state", () => {
        setState(true, element("a", PRESENTER), element("b", "viewer"));
        expect(elementIds()).toEqual(["a", "b"]);
        expect(get(screenAnnotationEnabledStore).get(PRESENTER)).toBe(true);
    });

    it("shows a draft only while its sender may draw, until it is finished", () => {
        sendDraft("viewer", element("v", "viewer"));
        expect(elementIds()).toEqual([]);

        setState(true);
        sendDraft("viewer", element("v", "viewer"));
        expect(elementIds()).toEqual(["v"]);
        expect(get(screenAnnotationElementsStore).get(PRESENTER)?.[0].authorUserId).toBe("viewer");
        // Shown, but not saved yet: a draft is not counted as a finished element.
        expect(get(screenAnnotationFinishedCountStore).get(PRESENTER)).toBe(0);

        // Finished: the state element replaces the draft, which does not come back once erased.
        setState(true, element("v", "viewer"));
        expect(elementIds()).toEqual(["v"]);
        expect(get(screenAnnotationFinishedCountStore).get(PRESENTER)).toBe(1);
        setState(true);
        expect(elementIds()).toEqual([]);
    });

    it("drops a draft given up by its author, or too large to render safely", () => {
        setState(true);
        sendDraft("viewer", element("v", "viewer"));
        events.next({
            sender: "viewer",
            screenAnnotation: { targetUserId: PRESENTER, operation: { $case: "dropDraftId", dropDraftId: "v" } },
        });
        expect(elementIds()).toEqual([]);

        sendDraft("viewer", { ...element("w", "viewer"), width: 10 });
        expect(elementIds()).toEqual([]);
    });

    it("drops the draft of a user who leaves", () => {
        setState(true);
        sendDraft("viewer", element("v", "viewer"));
        userLeft.next({ spaceUserId: "viewer" });
        expect(elementIds()).toEqual([]);
    });

    it("takes a viewer out of drawing mode when the presenter stops letting them draw, for good", () => {
        setState(true);
        localAnnotationTargetStore.set(PRESENTER);
        setState(false);
        expect(get(localAnnotationTargetStore)).toBeUndefined();
        setState(true);
        expect(get(localAnnotationTargetStore)).toBeUndefined();
    });

    it("takes a viewer out of drawing mode when the share stops", () => {
        setState(true);
        localAnnotationTargetStore.set(PRESENTER);
        annotations.set({});
        expect(get(localAnnotationTargetStore)).toBeUndefined();
    });

    it("takes the presenter out of drawing mode when they stop sharing", () => {
        sharing.state.set(true);
        screenAnnotationManager.toggleDrawingOnMyShare();
        expect(get(localAnnotationTargetStore)).toBe(ME);
        sharing.state.set(false);
        expect(get(localAnnotationTargetStore)).toBeUndefined();
    });

    it("clears my annotations for everyone when I switch to another screen", () => {
        sharing.state.set(true);
        sharing.source.set({ id: "screen:1" });
        sharing.source.set({ id: "screen:1" });
        expect(stateManager.clearScreenAnnotations).not.toHaveBeenCalled();

        sharing.source.set({ id: "screen:2" });
        expect(stateManager.clearScreenAnnotations).toHaveBeenCalledOnce();
    });

    it("never undoes or redoes what another user erased", () => {
        setState(true);
        screenAnnotationManager.upsertElement(PRESENTER, element("first", ME));
        screenAnnotationManager.upsertElement(PRESENTER, element("second", ME));
        setState(true, element("first", ME), element("second", ME));
        // The presenter erases our second stroke: our undo skips it and takes back the first one.
        setState(true, element("first", ME));
        screenAnnotationManager.undoLastLocalElement(PRESENTER);
        expect(stateManager.removeScreenAnnotation.mock.calls).toEqual([[PRESENTER, "first"]]);
        setState(true);

        // Redo brings back what we undid, never what the presenter erased.
        stateManager.upsertScreenAnnotation.mockClear();
        screenAnnotationManager.redoLastLocalElement(PRESENTER);
        screenAnnotationManager.redoLastLocalElement(PRESENTER);
        expect(stateManager.upsertScreenAnnotation).toHaveBeenCalledOnce();
        expect(stateManager.upsertScreenAnnotation).toHaveBeenCalledWith(PRESENTER, element("first", ME));
    });

    it("shows every highlight for a few seconds, ours included, and never saves it", () => {
        vi.useFakeTimers();
        setState(true);
        const stroke = { ...element("t1", "viewer"), tool: "highlight" };
        sendDraft("viewer", stroke);
        sendDraft("viewer", { ...stroke, id: "t2" });
        expect(elementIds()).toEqual(["t1", "t2"]);
        // Shown for 2 s, then faded out in 1.5 s.
        const [shown] = get(screenAnnotationElementsStore).get(PRESENTER) ?? [];
        vi.advanceTimersByTime(2000);
        expect(screenAnnotationManager.opacity(shown)).toBe(1);
        vi.advanceTimersByTime(750);
        expect(screenAnnotationManager.opacity(shown)).toBe(0.5);
        vi.advanceTimersByTime(751);
        expect(elementIds()).toEqual([]);

        const mine = { ...element("mine", ME), tool: "highlight" };
        screenAnnotationManager.upsertElement(PRESENTER, mine);
        expect(emitPublicMessage).toHaveBeenCalledWith({
            $case: "screenAnnotation",
            screenAnnotation: { targetUserId: PRESENTER, operation: { $case: "draft", draft: mine } },
        });
        expect(elementIds()).toEqual(["mine"]);
        screenAnnotationManager.undoLastLocalElement(PRESENTER);
        expect(stateManager.upsertScreenAnnotation).not.toHaveBeenCalled();
        expect(stateManager.removeScreenAnnotation).not.toHaveBeenCalled();
        vi.advanceTimersByTime(3501);
        expect(elementIds()).toEqual([]);
    });

    it("shows the pointers on top of everything, the highlight dragged under them included", () => {
        setState(true, element("saved", "viewer"));
        sendDraft("viewer", { ...element("p", "viewer"), tool: "pointer" });
        sendDraft("viewer", { ...element("h", "viewer"), tool: "highlight" });
        expect(elementIds()).toEqual(["saved", "h", "p"]);
    });

    it("drops the draft of a refused element", async () => {
        stateManager.upsertScreenAnnotation.mockReturnValueOnce(Promise.reject(new Error("refused")));
        screenAnnotationManager.upsertElement(PRESENTER, element("mine", ME));
        await vi.waitFor(() =>
            expect(emitPublicMessage).toHaveBeenCalledWith({
                $case: "screenAnnotation",
                screenAnnotation: { targetUserId: PRESENTER, operation: { $case: "dropDraftId", dropDraftId: "mine" } },
            }),
        );
    });
});
