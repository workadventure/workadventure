import { describe, expect, it, vi } from "vitest";
import { configureSessionPermissions } from "./session-permissions";
import { createDesktopConfig, type DesktopConfig } from "./desktop-url-policy";

// The handler as the test calls it: fakes stand in for Electron's WebContents and details.
type PermissionHandler = (
    contents: { getURL(): string },
    permission: string,
    callback: (granted: boolean) => void,
    details: { requestingUrl?: string }
) => void;

function permissions() {
    let request: PermissionHandler | undefined;
    let config = createDesktopConfig({
        portalUrl: "https://admin.example.org",
        allowedOrigins: ["https://play.example.org"],
    });
    configureSessionPermissions(
        {
            setPermissionRequestHandler: (handler) => {
                request = handler as unknown as PermissionHandler;
            },
        },
        () => config
    );
    return {
        allow(permission: string, url: string, requestingUrl = url) {
            const result = vi.fn<(granted: boolean) => void>();
            request?.({ getURL: () => url }, permission, result, { requestingUrl });
            return result.mock.calls[0]?.[0];
        },
        setConfig(next: DesktopConfig) {
            config = next;
        },
    };
}
describe("world session permissions", () => {
    it("allows clipboard text writes for the trusted world", () => {
        expect(permissions().allow("clipboard-sanitized-write", "https://play.example.org/@/world")).toBe(true);
    });
    it("does not grant clipboard reads or unknown permissions", () => {
        const policy = permissions();
        for (const permission of ["clipboard-read", "deprecated-sync-clipboard-read", "unknown"]) {
            expect(policy.allow(permission, "https://play.example.org/@/world")).toBe(false);
        }
    });
    it("judges the page the user opened, not the embedded frame asking", () => {
        // Chromium only lets the frame use it if the world delegated it with an allow attribute.
        expect(permissions().allow("media", "https://play.example.org/@/world", "https://meet.jit.si/room")).toBe(true);
        expect(permissions().allow("media", "https://external.example.org/", "https://play.example.org/@/world")).toBe(
            false
        );
    });
    it("checks the current allow-list", () => {
        const policy = permissions();
        expect(policy.allow("clipboard-sanitized-write", "https://play.example.org/@/world")).toBe(true);
        policy.setConfig(createDesktopConfig({ portalUrl: "https://other.example.org" }));
        expect(policy.allow("clipboard-sanitized-write", "https://play.example.org/@/world")).toBe(false);
    });
    it("preserves existing media permissions on trusted origins", () => {
        for (const permission of ["media", "display-capture", "notifications", "fullscreen"]) {
            expect(permissions().allow(permission, "https://play.example.org/@/world")).toBe(true);
            expect(permissions().allow(permission, "https://external.example.org")).toBe(false);
        }
    });
});
