import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { readable, writable } from "svelte/store";
import type { RecordingState } from "@workadventure/shared-utils";
import RecordingProducerPanel from "../../../src/front/Components/PopUp/Recording/RecordingProducerPanel.svelte";
import type { SpaceInterface } from "../../../src/front/Space/SpaceInterface";

vi.mock("../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    const text = (value: string) => () => value;
    return {
        LL: readable({
            recording: {
                actionbar: {
                    spacePicker: { layout: { map: text("Map"), balanced: text("Balanced"), cameras: text("Cameras") } },
                    producer: {
                        preview: text("In the video now"),
                        layout: text("Layout"),
                        zoom: text("Zoom"),
                        zoomLevel: { tight: text("Close"), wide: text("Wide"), whole: text("Whole") },
                        framing: text("Framing"),
                        follow: text("Follow"),
                        frameMyView: text("Frame my view"),
                        cameras: text("Cameras"),
                        pin: text("Pin"),
                        unpin: text("Unpin"),
                        pinHint: text("hint"),
                    },
                },
            },
        }),
    };
});

function fakeSpace(recording: RecordingState) {
    const setRecordingProduction = vi.fn().mockResolvedValue(undefined);
    const users = new Map([
        ["room_1", { spaceUserId: "room_1", name: "Alice" }],
        ["room_2", { spaceUserId: "room_2", name: "Bob" }],
    ]);
    const space = {
        state: { observe: () => writable(recording), setRecordingProduction },
        usersStore: readable(users),
    } as unknown as SpaceInterface;
    return { space, setRecordingProduction };
}

const production = { layout: "balanced", zoom: "wide", frame: null, pins: [] } as const;
const recording: RecordingState = {
    recording: true,
    recorder: "room_1",
    status: "recording",
    production: { ...production, pins: [] },
};

describe("recording producer panel", () => {
    const target = document.createElement("div");
    let component: ReturnType<typeof mount> | undefined;

    afterEach(async () => {
        const mounted = component;
        component = undefined;
        if (mounted) await unmount(mounted, { outro: false });
        target.replaceChildren();
    });

    it("is not shown for a recording without the map", () => {
        const { space } = fakeSpace({ recording: true, recorder: "room_1", status: "recording" });
        component = mount(RecordingProducerPanel, { target, props: { space } });
        flushSync();
        expect(target.querySelector("[data-testid='recording-producer-panel']")).toBeNull();
    });

    it("changes the layout, the zoom and the pins of the recording", () => {
        const { space, setRecordingProduction } = fakeSpace(recording);
        component = mount(RecordingProducerPanel, { target, props: { space } });
        flushSync();
        const click = (selector: string) => target.querySelector<HTMLButtonElement>(selector)?.click();

        click("[data-testid='recording-producer-layout-cameras']");
        click("[data-testid='recording-producer-zoom-whole']");
        click("[data-testid='recording-producer-pin']");

        // Each change builds on the previous one, before the space state comes back with it.
        expect(setRecordingProduction.mock.calls.map((call) => call[0] as unknown)).toEqual([
            { ...production, layout: "cameras", pins: [] },
            { ...production, layout: "cameras", zoom: "whole", pins: [] },
            { ...production, layout: "cameras", zoom: "whole", pins: ["room_1"] },
        ]);
        flushSync();
        expect(
            target.querySelector("[data-testid='recording-producer-layout-cameras']")?.getAttribute("aria-pressed"),
        ).toBe("true");
    });
});
