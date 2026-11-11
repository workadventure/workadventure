import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, tick, unmount } from "svelte";
import { localAnnotationTargetStore, screenAnnotationEnabledStore } from "../../Stores/ScreenAnnotationStore";
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
