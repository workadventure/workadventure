import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import type { Writable } from "svelte/store";
import { Subject } from "rxjs";
import type { ScreenAnnotationElement, ScreenAnnotationEvent } from "@workadventure/messages";
import type { SpaceInterface } from "../SpaceInterface";
import type { Streamable } from "../Streamable";
import {
    screenAnnotationElementsStore,
    screenAnnotationEnabledStore,
    setAnnotationEnabled,
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
const userJoined = new Subject<void>();
const emitPublicMessage = vi.fn();
const space = {
    mySpaceUserId: ME,
    observePublicEvent: () => events,
    observeUserJoined: userJoined,
    onLeaveSpace: new Subject<void>(),
    emitPublicMessage,
} as unknown as SpaceInterface;

function element(id: string, authorUserId: string): ScreenAnnotationElement {
    return { id, authorUserId, tool: "pen", color: "#fff", width: 0.01, points: [{ x: 0, y: 0 }] };
}

function send(sender: string, targetUserId: string, operation: ScreenAnnotationEvent["operation"]) {
    events.next({ sender, screenAnnotation: { targetUserId, operation } });
}

function elementIds(target: string) {
    return (get(screenAnnotationElementsStore).get(target) ?? []).map((e) => e.id);
}

describe("ScreenAnnotationManager remote events", () => {
    beforeEach(() => {
        sharing.source.set(undefined);
        sharing.state.set(false);
        emitPublicMessage.mockClear();
        screenAnnotationManager.bindToSpace(space, new Subject<Streamable>());
    });

    it("lets only the presenter turn annotation on or off", () => {
        send("viewer", PRESENTER, { $case: "annotationEnabled", annotationEnabled: true });
        expect(get(screenAnnotationEnabledStore).get(PRESENTER)).toBeUndefined();

        send(PRESENTER, PRESENTER, { $case: "annotationEnabled", annotationEnabled: true });
        expect(get(screenAnnotationEnabledStore).get(PRESENTER)).toBe(true);
    });

    it("lets only the presenter clear their screen", () => {
        send(PRESENTER, PRESENTER, { $case: "upsertElement", upsertElement: element("a", PRESENTER) });
        send("viewer", PRESENTER, { $case: "clearAll", clearAll: true });
        expect(elementIds(PRESENTER)).toEqual(["a"]);
    });

    it("drops an element whose author is not its sender", () => {
        send("viewer", PRESENTER, { $case: "upsertElement", upsertElement: element("forged", PRESENTER) });
        expect(elementIds(PRESENTER)).toEqual([]);
    });

    it("drops strokes from viewers while the presenter has not allowed annotation", () => {
        send("viewer", PRESENTER, { $case: "upsertElement", upsertElement: element("v0", "viewer") });
        expect(elementIds(PRESENTER)).toEqual([]);
    });

    it("re-announces the setting to newcomers while sharing with annotation allowed", () => {
        userJoined.next();
        expect(emitPublicMessage).not.toHaveBeenCalled();

        sharing.state.set(true);
        setAnnotationEnabled(ME, true);
        userJoined.next();
        expect(emitPublicMessage).toHaveBeenCalledWith({
            $case: "screenAnnotation",
            screenAnnotation: { targetUserId: ME, operation: { $case: "annotationEnabled", annotationEnabled: true } },
        });
    });

    it("drops strokes from viewers once the presenter turned annotation off", () => {
        send(PRESENTER, PRESENTER, { $case: "annotationEnabled", annotationEnabled: false });
        send("viewer", PRESENTER, { $case: "upsertElement", upsertElement: element("v", "viewer") });
        expect(elementIds(PRESENTER)).toEqual([]);
    });

    it("on my own share, accepts viewer strokes only while I allow them", () => {
        send("viewer", ME, { $case: "upsertElement", upsertElement: element("v1", "viewer") });
        expect(elementIds(ME)).toEqual([]);

        setAnnotationEnabled(ME, true);
        send("viewer", ME, { $case: "upsertElement", upsertElement: element("v2", "viewer") });
        expect(elementIds(ME)).toEqual(["v2"]);
    });

    it("drops elements too large to render safely", () => {
        const huge = { ...element("w", PRESENTER), width: 10 };
        send(PRESENTER, PRESENTER, { $case: "upsertElement", upsertElement: huge });
        const long = { ...element("p", PRESENTER), points: Array.from({ length: 6000 }, () => ({ x: 0, y: 0 })) };
        send(PRESENTER, PRESENTER, { $case: "upsertElement", upsertElement: long });
        expect(elementIds(PRESENTER)).toEqual([]);
    });

    it("clears my annotations for everyone when I switch to another screen", () => {
        sharing.state.set(true);
        sharing.source.set({ id: "screen:1" });
        screenAnnotationManager.upsertElement(ME, element("mine", ME));
        emitPublicMessage.mockClear();

        sharing.source.set({ id: "screen:1" });
        expect(elementIds(ME)).toEqual(["mine"]);

        sharing.source.set({ id: "screen:2" });
        expect(elementIds(ME)).toEqual([]);
        expect(emitPublicMessage).toHaveBeenCalledWith({
            $case: "screenAnnotation",
            screenAnnotation: { targetUserId: ME, operation: { $case: "clearAll", clearAll: true } },
        });
    });
});
