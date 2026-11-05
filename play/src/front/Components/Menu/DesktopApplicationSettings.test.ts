import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, tick, unmount } from "svelte";
import { mock } from "vitest-mock-extended";
import type { DesktopWindowModeState, WorkAdventureDesktopApi } from "@workadventure/desktop-api";
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
        // startAtLogin: undefined, as on a desktop app older than the switch (the mock would invent one).
        // openSettings: undefined likewise, everywhere the section shows the settings itself.
        window.WAD = mock<WorkAdventureDesktopApi>({
            desktop: true,
            openSettings: undefined,
            getVersion,
            startAtLogin: undefined,
            windowMode: undefined,
        });
        component = mount(Settings, { target: document.body });
        await vi.waitFor(() =>
            expect(document.querySelector('[data-testid="desktop-installed-version"]')?.textContent).toBe("1.1.0"),
        );
        expect(document.querySelector('[role="status"]')?.textContent).toContain("You can continue");
        expect(getVersion).toHaveBeenCalledOnce();
        expect(window.WAD.hello).not.toHaveBeenCalled();
    });
    it("shows whether the app starts at login and keeps what the system answers", async () => {
        // The system does not take the change (macOS waits for the user's approval in its settings).
        const set = vi.fn().mockResolvedValue(false);
        window.WAD = mock<WorkAdventureDesktopApi>({
            desktop: true,
            openSettings: undefined,
            getVersion: vi.fn().mockResolvedValue("1.3.0"),
            startAtLogin: { get: vi.fn().mockResolvedValue(false), set },
            windowMode: undefined,
        });
        component = mount(Settings, { target: document.body });
        await vi.waitFor(() => expect(document.querySelector("#desktop-start-at-login")).not.toBeNull());
        const input = document.querySelector<HTMLInputElement>("#desktop-start-at-login");
        expect(input?.checked).toBe(false);

        input?.click();
        await vi.waitFor(() => expect(set).toHaveBeenCalledWith(true));
        await vi.waitFor(() => expect(input?.checked).toBe(false));
    });
    it("lets Linux users under Wayland choose the window mode, warning before a Wayland restart", async () => {
        const state: DesktopWindowModeState = {
            saved: "x11",
            setByCommandLine: false,
            x11Unavailable: false,
            restartNeeded: false,
        };
        const set = vi.fn().mockResolvedValue({ ...state, saved: "wayland", restartNeeded: true });
        const restart = vi.fn();
        window.WAD = mock<WorkAdventureDesktopApi>({
            desktop: true,
            openSettings: undefined,
            getVersion: vi.fn().mockResolvedValue("1.3.0"),
            startAtLogin: undefined,
            windowMode: { get: vi.fn().mockResolvedValue(state), set, restart },
        });
        component = mount(Settings, { target: document.body });
        await vi.waitFor(() => expect(document.querySelector("#desktop-window-mode-x11")).not.toBeNull());
        expect(document.querySelector<HTMLInputElement>("#desktop-window-mode-x11")?.checked).toBe(true);
        expect(document.querySelector('[data-testid="desktop-window-mode-restart"]')).toBeNull();

        document.querySelector<HTMLInputElement>("#desktop-window-mode-wayland")?.click();
        await vi.waitFor(() => expect(set).toHaveBeenCalledWith("wayland"));
        const notice = await vi.waitFor(() => {
            const element = document.querySelector('[data-testid="desktop-window-mode-restart"]');
            expect(element).not.toBeNull();
            return element;
        });
        expect(notice?.textContent).toContain("open in the middle of your screen");

        document.querySelector<HTMLButtonElement>('[data-testid="desktop-window-mode-restart-now"]')?.click();
        expect(restart).toHaveBeenCalledOnce();
    });
    it("disables the window mode choice when the command line sets it", async () => {
        window.WAD = mock<WorkAdventureDesktopApi>({
            desktop: true,
            openSettings: undefined,
            getVersion: vi.fn().mockResolvedValue("1.3.0"),
            startAtLogin: undefined,
            windowMode: {
                get: vi.fn().mockResolvedValue({
                    saved: "x11",
                    setByCommandLine: true,
                    x11Unavailable: false,
                    restartNeeded: false,
                }),
                set: vi.fn(),
                restart: vi.fn(),
            },
        });
        component = mount(Settings, { target: document.body });
        await vi.waitFor(() => expect(document.querySelector("#desktop-window-mode-wayland")).not.toBeNull());
        expect(document.querySelector<HTMLInputElement>("#desktop-window-mode-wayland")?.disabled).toBe(true);
        expect(document.querySelector('[data-testid="desktop-window-mode"]')?.textContent).toContain(
            "--ozone-platform",
        );
    });
    it("sends desktop apps with a settings window there, instead of repeating its settings", async () => {
        const openSettings = vi.fn();
        const startAtLogin = { get: vi.fn().mockResolvedValue(true), set: vi.fn() };
        window.WAD = mock<WorkAdventureDesktopApi>({
            desktop: true,
            getVersion: vi.fn().mockResolvedValue("1.3.0"),
            openSettings,
            startAtLogin,
            windowMode: undefined,
        });
        component = mount(Settings, { target: document.body });
        const button = await vi.waitFor(() => {
            const element = document.querySelector<HTMLButtonElement>('[data-testid="desktop-open-settings"]');
            expect(element).not.toBeNull();
            return element;
        });
        expect(document.querySelector("#desktop-start-at-login")).toBeNull();
        expect(startAtLogin.get).not.toHaveBeenCalled();

        button?.click();
        expect(openSettings).toHaveBeenCalledOnce();
    });
    it("ignores a version response after the panel has closed", async () => {
        let finish: ((version: string) => void) | undefined;
        const version = new Promise<string>((resolve) => {
            finish = resolve;
        });
        window.WAD = mock<WorkAdventureDesktopApi>({
            desktop: true,
            openSettings: undefined,
            getVersion: () => version,
            startAtLogin: undefined,
            windowMode: undefined,
        });
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
