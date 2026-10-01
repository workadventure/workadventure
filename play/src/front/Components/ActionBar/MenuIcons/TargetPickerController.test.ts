import type * as Svelte from "svelte";
import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above the imports: their shared state must be hoisted too.
const { destroyCallbacks, closePopup, showFloatingUi } = vi.hoisted(() => {
    const close = vi.fn();
    return { destroyCallbacks: [] as (() => void)[], closePopup: close, showFloatingUi: vi.fn(() => close) };
});
vi.mock("svelte", async (importOriginal) => ({
    ...(await importOriginal<typeof Svelte>()),
    onDestroy: (callback: () => void) => destroyCallbacks.push(callback),
}));
vi.mock("../../../Utils/svelte-floatingui-show", () => ({ showFloatingUi }));

import { type TargetRow, TargetPickerController } from "./TargetPickerController";

const row = (id: string, disabled = false): TargetRow => ({ id, label: id, selected: false, disabled, testId: id });

function setup(rows: TargetRow[]) {
    const controller = new TargetPickerController(() => ({}) as HTMLElement);
    const onselect = vi.fn();
    const props = { title: "Pick", testId: "picker", icon: () => undefined as never, onselect };
    return { controller, onselect, act: () => controller.actOrPick(writable(rows), props) };
}

describe("TargetPickerController", () => {
    beforeEach(() => {
        destroyCallbacks.length = 0;
        vi.clearAllMocks();
    });

    it("acts right away on a single target", () => {
        const { onselect, act } = setup([row("bubble")]);
        act();
        expect(onselect).toHaveBeenCalledWith(row("bubble"));
        expect(showFloatingUi).not.toHaveBeenCalled();
    });

    it("does nothing on a single target the user may not act on, nor without any target", () => {
        const single = setup([row("area", true)]);
        single.act();
        const none = setup([]);
        none.act();
        expect(single.onselect).not.toHaveBeenCalled();
        expect(none.onselect).not.toHaveBeenCalled();
        expect(showFloatingUi).not.toHaveBeenCalled();
    });

    it("opens the picker with several targets, and closes it on the next click", () => {
        const { onselect, act } = setup([row("bubble"), row("zone")]);
        act();
        expect(showFloatingUi).toHaveBeenCalledOnce();
        act();
        expect(closePopup).toHaveBeenCalledOnce();
        expect(onselect).not.toHaveBeenCalled();
    });

    it("closes the picker when the button goes away", () => {
        const { act } = setup([row("bubble"), row("zone")]);
        act();
        destroyCallbacks.forEach((callback) => callback());
        expect(closePopup).toHaveBeenCalledOnce();
    });
});
