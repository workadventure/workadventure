import { expect, test } from "vitest";
import { createWorldViewWebPreferences } from "./world-view-policy";

test("world views keep the hardened renderer settings", () => {
    const preferences = createWorldViewWebPreferences("/preload.js");
    expect(preferences.nodeIntegration).toBe(false);
    expect(preferences.contextIsolation).toBe(true);
    expect(preferences.sandbox).toBe(true);
    expect(preferences.webSecurity).toBe(true);
    expect(preferences.preload).toBe("/preload.js");
});
