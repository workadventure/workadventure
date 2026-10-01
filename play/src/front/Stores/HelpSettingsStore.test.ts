import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deniedStore, addPopup, removePopup } = vi.hoisted(() => ({
    deniedStore: { set: (_value: { camera: boolean; microphone: boolean }) => {} },
    addPopup: vi.fn(),
    removePopup: vi.fn(),
}));

vi.mock("./MediaStatusStore", () => {
    const store = writable({ camera: false, microphone: false });
    deniedStore.set = store.set;
    return { mediaPermissionDeniedStore: store };
});
vi.mock("./PopupStore", () => ({ popupStore: { addPopup, removePopup } }));
vi.mock("../Components/HelpSettings/HelpCameraSettingsPopup.svelte", () => ({ default: {} }));

await import("./HelpSettingsStore");

describe("help camera settings popup", () => {
    beforeEach(() => {
        deniedStore.set({ camera: false, microphone: false });
        addPopup.mockClear();
        removePopup.mockClear();
    });

    it("opens when a device becomes denied", () => {
        deniedStore.set({ camera: true, microphone: false });
        expect(addPopup).toHaveBeenCalledTimes(1);
    });

    it("does not reopen while the same device stays denied", () => {
        deniedStore.set({ camera: true, microphone: false });
        deniedStore.set({ camera: true, microphone: false });
        expect(addPopup).toHaveBeenCalledTimes(1);
    });

    it("opens again when another device becomes denied", () => {
        deniedStore.set({ camera: true, microphone: false });
        deniedStore.set({ camera: true, microphone: true });
        expect(addPopup).toHaveBeenCalledTimes(2);
    });

    it("closes once nothing is denied any more", () => {
        deniedStore.set({ camera: true, microphone: false });
        deniedStore.set({ camera: false, microphone: false });
        expect(removePopup).toHaveBeenCalled();
    });
});
