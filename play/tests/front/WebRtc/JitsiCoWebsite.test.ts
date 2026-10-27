import { writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/Stores/MediaStore", () => ({
    requestedCameraState: writable(true),
    requestedMicrophoneState: writable(true),
}));

import { mergeConfig } from "../../../src/front/WebRtc/CoWebsite/JitsiCoWebsite";

describe("mergeConfig", () => {
    it("disables the prejoin page for old and new Jitsi Meet versions by default", () => {
        for (const config of [undefined, {}]) {
            const merged = mergeConfig(config);

            expect(merged.prejoinPageEnabled).toBe(false);
            expect(merged.prejoinConfig).toEqual({ enabled: false });
        }
    });

    it.each([{ prejoinPageEnabled: true }, { prejoinConfig: { enabled: true } }])(
        "enables the prejoin page when the map asks for it with %o",
        (config) => {
            const merged = mergeConfig(config);

            expect(merged.prejoinPageEnabled).toBe(true);
            expect(merged.prejoinConfig).toEqual({ enabled: true });
        },
    );

    it("keeps the other prejoin settings of the map", () => {
        const merged = mergeConfig({ prejoinConfig: { hideDisplayName: true } });

        expect(merged.prejoinConfig).toEqual({ enabled: false, hideDisplayName: true });
    });
});
