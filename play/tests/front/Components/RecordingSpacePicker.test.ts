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
                actionbar: {
                    title: { start: () => "Start", stop: () => "Stop" },
                    desc: { advert: () => "Advert" },
                    spacePicker: {
                        discussion: () => "Record discussion",
                        withMap: () => "With the map:",
                        camerasOnly: () => "Cameras only",
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
    const target = document.createElement("div");
    let component: ReturnType<typeof mount> | undefined;

    afterEach(async () => {
        const mounted = component;
        component = undefined;
        if (mounted) await unmount(mounted, { outro: false });
        target.replaceChildren();
    });

    it("only offers the map when the server allows it", () => {
        component = mount(RecordingSpacePicker, { target, props: { rowsStore: readable([row]) } });
        flushSync();
        expect(target.querySelector("[data-testid^='recording-space-action-start-with-map']")).toBeNull();
    });

    it("starts over the map in the chosen layout, or with the cameras only", () => {
        const onselect = vi.fn();
        component = mount(RecordingSpacePicker, {
            target,
            props: { rowsStore: readable([row]), withMapAvailable: true, onselect },
        });
        flushSync();

        target
            .querySelector<HTMLButtonElement>("[data-testid='recording-space-action-start-with-map-cameras']")
            ?.click();
        target.querySelector<HTMLButtonElement>("[data-testid='recording-space-action-start']")?.click();

        expect(onselect.mock.calls).toEqual([
            [row, "cameras"],
            [row, undefined],
        ]);
    });
});
