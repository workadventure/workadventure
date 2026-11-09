import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, tick, unmount } from "svelte";
import { get } from "svelte/store";
import {
    currentAnnotationToolStore,
    lastPenToolStore,
    localAnnotationTargetStore,
    screenAnnotationEnabledStore,
} from "../../Stores/ScreenAnnotationStore";
import Toolbar from "./ScreenAnnotationToolbar.svelte";

const manager = vi.hoisted(() => ({ localUserId: "presenter", setOthersAllowed: vi.fn() }));
vi.mock("../../Space/ScreenAnnotation/ScreenAnnotationManager", () => ({ screenAnnotationManager: manager }));

let component: ReturnType<typeof mount> | undefined;
afterEach(async () => {
    const mounted = component;
    component = undefined;
    if (mounted) await unmount(mounted);
    document.body.replaceChildren();
    screenAnnotationEnabledStore.set(new Map());
    vi.clearAllMocks();
});

describe("annotation permission toggle", () => {
    it("is reachable before drawing and follows the shared permission", async () => {
        localAnnotationTargetStore.set(undefined);
        component = mount(Toolbar, { target: document.body, props: { targetUserId: "presenter", isPresenter: true } });
        await tick();
        const toggle = document.querySelector<HTMLButtonElement>('[data-testid="annotation-allow-toggle"]');
        if (!toggle) throw new Error("Missing permission toggle");

        expect(toggle.getAttribute("aria-pressed")).toBe("false");
        toggle.click();
        expect(manager.setOthersAllowed).toHaveBeenLastCalledWith(true);

        screenAnnotationEnabledStore.set(new Map([["presenter", true]]));
        await tick();
        expect(toggle.getAttribute("aria-pressed")).toBe("true");
        toggle.click();
        expect(manager.setOthersAllowed).toHaveBeenLastCalledWith(false);
    });
});

describe("pen button", () => {
    const find = (testId: string) => document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
    async function click(testId: string) {
        const element = find(testId);
        if (!element) throw new Error(`Missing ${testId}`);
        element.click();
        await tick();
    }

    it("selects the last pen picked and opens a menu of both pens", async () => {
        localAnnotationTargetStore.set("presenter");
        currentAnnotationToolStore.set("line");
        lastPenToolStore.set("pen");
        component = mount(Toolbar, { target: document.body, props: { targetUserId: "presenter", isPresenter: true } });
        await tick();

        await click("annotation-pen-button");
        expect(get(currentAnnotationToolStore)).toBe("pen");
        await click("annotation-tool-temporaryPen");
        expect(get(currentAnnotationToolStore)).toBe("temporaryPen");
        expect(find("annotation-pen-menu")).toBeNull();

        await click("annotation-tool-line");
        await click("annotation-pen-button");
        expect(get(currentAnnotationToolStore)).toBe("temporaryPen");
        expect(find("annotation-pen-menu")).not.toBeNull();

        // A click elsewhere closes the menu; so does Escape, without leaving drawing mode.
        document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
        await tick();
        expect(find("annotation-pen-menu")).toBeNull();
        await click("annotation-pen-button");
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        await tick();
        expect(find("annotation-pen-menu")).toBeNull();
        expect(get(localAnnotationTargetStore)).toBe("presenter");
    });
});
