import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { readable } from "svelte/store";
import RecordingSpacePicker from "../../../src/front/Components/PopUp/Recording/RecordingSpacePicker.svelte";
import type { RecordingSpaceRow } from "../../../src/front/Components/ActionBar/MenuIcons/RecordingMenuUtils";

vi.mock("../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    return {
        LL: readable({
            recording: {
                close: () => "Close",
                actionbar: {
                    title: { start: () => "Start", stop: () => "Stop" },
                    desc: { advert: () => "Advert" },
                    spacePicker: {
                        title: () => "Record",
                        source: () => "What to record",
                        savedHint: () => "Saved when you stop.",
                        discussion: () => "Record discussion",
                        withMap: () => "With the map:",
                        camerasOnly: () => "Cameras only",
                        camerasOnlyHint: () => "No producer panel.",
                        layout: { map: () => "Map first", balanced: () => "Balanced", cameras: () => "Cameras first" },
                    },
                },
            },
        }),
    };
});

const row = {
    action: "start",
    disabled: false,
    kind: "discussion",
    recorderName: null,
    recorderSpaceUserId: null,
    space: {},
    spaceName: "bubble",
    status: "available",
} as unknown as RecordingSpaceRow;

describe("recording space picker", () => {
    // In the document: a detached radio is checked by a click but does not fire its change event.
    const target = document.body.appendChild(document.createElement("div"));
    let component: ReturnType<typeof mount> | undefined;

    afterEach(async () => {
        const mounted = component;
        component = undefined;
        if (mounted) await unmount(mounted, { outro: false });
        target.replaceChildren();
    });

    const startButton = () => target.querySelector<HTMLButtonElement>("[data-testid='recording-space-action-start']");

    it("only offers the map when the server allows it", () => {
        const onselect = vi.fn();
        component = mount(RecordingSpacePicker, { target, props: { rowsStore: readable([row]), onselect } });
        flushSync();
        expect(target.querySelector("[data-testid^='recording-space-layout-']")).toBeNull();
        startButton()?.click();
        expect(onselect.mock.calls).toEqual([[row, undefined]]);
    });

    it("starts over the map in the chosen layout, or with the cameras only", async () => {
        const onselect = vi.fn();
        const pick = (layout: string) => {
            target.querySelector<HTMLInputElement>(`[data-testid='recording-space-layout-${layout}'] input`)?.click();
            flushSync();
            startButton()?.click();
        };
        for (const layout of ["cameras", "none"]) {
            component = mount(RecordingSpacePicker, {
                target,
                props: { rowsStore: readable([row]), withMapAvailable: true, onselect },
            });
            flushSync();
            pick(layout);
            await unmount(component, { outro: false });
            component = undefined;
            target.replaceChildren();
        }

        expect(onselect.mock.calls).toEqual([
            [row, "cameras"],
            [row, undefined],
        ]);
    });

    it("says a recording of the cameras only cannot be directed, and closes on Escape", () => {
        const onclose = vi.fn();
        component = mount(RecordingSpacePicker, {
            target,
            props: { rowsStore: readable([row]), withMapAvailable: true, onclose },
        });
        flushSync();
        const picker = target.querySelector<HTMLElement>("[data-testid='recording-space-picker']");
        expect(document.activeElement).toBe(picker);
        expect(target.querySelector("[data-testid='recording-space-cameras-only-hint']")).toBeNull();
        target.querySelector<HTMLInputElement>("[data-testid='recording-space-layout-none'] input")?.click();
        flushSync();
        expect(target.querySelector("[data-testid='recording-space-cameras-only-hint']")).not.toBeNull();
        picker?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(onclose).toHaveBeenCalledWith(true);
    });

    it("puts the person's own recording first, with its stop button", () => {
        const onselect = vi.fn();
        const own = {
            ...row,
            action: "stop",
            status: "recording-self",
            space: { state: { observe: () => readable({}) } },
        };
        component = mount(RecordingSpacePicker, {
            target,
            props: { rowsStore: readable([own as unknown as RecordingSpaceRow]), withMapAvailable: true, onselect },
        });
        flushSync();
        expect(startButton()).toBeNull();
        target.querySelector<HTMLButtonElement>("[data-testid='recording-space-action-stop']")?.click();
        expect(onselect.mock.calls).toEqual([[own, undefined]]);
    });
});
