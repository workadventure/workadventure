import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, tick, unmount } from "svelte";
import { loadLocale } from "../../../i18n/i18n-util.sync";
import { setLocale } from "../../../i18n/i18n-svelte";
const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("../../Phaser/Game/GameManager", () => ({ gameManager: { getCurrentGameScene: () => null } }));
vi.mock("../../Stores/GameSceneStore", async () => {
    const { writable } = await import("svelte/store");
    return { gameSceneStore: writable(null) };
});
vi.mock("../../Administration/AnalyticsClient", () => ({ analyticsClient: { trackAdminEvent: trackEvent } }));
import Guest from "./GuestSubMenu.svelte";
let component: ReturnType<typeof mount> | undefined;
const originalShare = Object.getOwnPropertyDescriptor(navigator, "share");
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
beforeEach(() => {
    vi.clearAllMocks();
    loadLocale("en-US");
    setLocale("en-US");
});
afterEach(async () => {
    const mounted = component;
    component = undefined;
    if (mounted) await unmount(mounted);
    document.body.replaceChildren();
    if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
    else Reflect.deleteProperty(navigator, "clipboard");
    if (originalShare) Object.defineProperty(navigator, "share", originalShare);
    else Reflect.deleteProperty(navigator, "share");
    vi.restoreAllMocks();
});
async function show(writeText: (text: string) => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    component = mount(Guest, { target: document.body });
    await tick();
    const button = document.querySelector<HTMLButtonElement>(".share-url button");
    const input = document.querySelector<HTMLInputElement>("#input-share-link");
    if (!button || !input) throw new Error("Missing share link controls");
    return { button, input };
}
describe("map invite copy confirmation", () => {
    it("confirms the copy only after the clipboard write succeeds", async () => {
        let finish: (() => void) | undefined;
        const pending = new Promise<void>((resolve) => {
            finish = resolve;
        });
        const write = vi.fn(() => pending);
        const { button, input } = await show(write);
        button.click();
        await tick();
        expect(write).toHaveBeenCalledWith(input.value);
        expect(button.classList.contains("btn-success")).toBe(false);
        finish?.();
        await tick();
        await vi.waitFor(() => expect(button.classList.contains("btn-success")).toBe(true));
        expect(trackEvent).toHaveBeenCalledWith("invite.sent", { inviteType: "copy_link" });
    });
    it("counts a successful fallback copy only once when native sharing fails", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        Object.defineProperty(navigator, "share", {
            value: vi.fn().mockRejectedValue(new Error("Share unavailable")),
            configurable: true,
        });
        const write = vi.fn().mockResolvedValue(undefined);
        await show(write);
        const shareButton = document.querySelector("button");
        if (!shareButton) throw new Error("Missing native share button");
        shareButton.click();
        await vi.waitFor(() => expect(trackEvent).toHaveBeenCalledOnce());
        expect(write).toHaveBeenCalledOnce();
    });
    it("does not announce a failed write as a successful invitation", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const { button } = await show(() => Promise.reject(new Error("Clipboard permission denied")));
        button.click();
        await tick();
        await tick();
        expect(button.classList.contains("btn-success")).toBe(false);
        expect(trackEvent).not.toHaveBeenCalled();
    });
});
