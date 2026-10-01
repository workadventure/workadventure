import { beforeEach, describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";
import { Subject } from "rxjs";
import type { ScreenAnnotationElement, ScreenAnnotationEvent } from "@workadventure/messages";
import type { SpaceInterface } from "../SpaceInterface";
import type { Streamable } from "../Streamable";
import {
    screenAnnotationElementsStore,
    screenAnnotationEnabledStore,
    setAnnotationEnabled,
} from "../../Stores/ScreenAnnotationStore";

vi.mock("../../Stores/ScreenSharingStore", () => ({ requestedScreenSharingState: writable(false) }));

import { screenAnnotationManager } from "./ScreenAnnotationManager";

const PRESENTER = "presenter";
const ME = "me";

const events = new Subject<{ sender: string; screenAnnotation: ScreenAnnotationEvent }>();
const space = {
    mySpaceUserId: ME,
    observePublicEvent: () => events,
    onLeaveSpace: new Subject<void>(),
    emitPublicMessage: vi.fn(),
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
});
