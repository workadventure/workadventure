import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, tick, unmount } from "svelte";
import { mock } from "vitest-mock-extended";
import type { WorkAdventureDesktopApi } from "../../Interfaces/DesktopAppInterfaces";
import { loadLocale } from "../../../i18n/i18n-util.sync";
import { setLocale } from "../../../i18n/i18n-svelte";
vi.mock("../../Enum/EnvironmentVariable", () => ({
    DESKTOP_VERSION_POLICY: {
        recommendedVersion: "1.3.0",
        minimumVersion: "1.2.0",
        downloadUrl: "https://downloads.example.org/desktop",
    },
}));
import Settings from "./DesktopApplicationSettings.svelte";
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
    loadLocale("en-US");
    setLocale("en-US");
});
afterEach(async () => {
    const mounted = component;
    component = undefined;
    if (mounted) await unmount(mounted);
    delete window.WAD;
    document.body.replaceChildren();
});
describe("desktop application settings", () => {
    it("offers the approved instance download page in a browser", async () => {
        delete window.WAD;
        component = mount(Settings, { target: document.body });
        await tick();
        expect(document.body.textContent).toContain("in your browser");
        expect(document.querySelector("a")?.getAttribute("href")).toBe("https://downloads.example.org/desktop");
    });
    it("shows the installed version and warns below the supported minimum without blocking", async () => {
        const getVersion = vi.fn().mockResolvedValue("1.1.0");
        window.WAD = mock<WorkAdventureDesktopApi>({ desktop: true, getVersion });
        component = mount(Settings, { target: document.body });
        await vi.waitFor(() =>
            expect(document.querySelector('[data-testid="desktop-installed-version"]')?.textContent).toBe("1.1.0"),
        );
        expect(document.querySelector('[role="status"]')?.textContent).toContain("You can continue");
        expect(getVersion).toHaveBeenCalledOnce();
        expect(window.WAD.hello).not.toHaveBeenCalled();
    });
    it("ignores a version response after the panel has closed", async () => {
        let finish: ((version: string) => void) | undefined;
        const version = new Promise<string>((resolve) => {
            finish = resolve;
        });
        window.WAD = mock<WorkAdventureDesktopApi>({ desktop: true, getVersion: () => version });
        component = mount(Settings, { target: document.body });
        await tick();
        const mounted = component;
        component = undefined;
        await unmount(mounted);
        finish?.("1.1.0");
        await tick();
        expect(document.querySelector('[data-testid="desktop-installed-version"]')).toBeNull();
    });
});
