import { describe, expect, it, vi } from "vitest";
import { configureSessionPermissions } from "./session-permissions";
import { createDesktopConfig } from "./desktop-url-policy";

function permissions() {
    let request;
    let config = createDesktopConfig({ portalUrl: "https://play.example.org" });
    configureSessionPermissions(
        {
            setPermissionRequestHandler: (handler) => {
                request = handler;
            },
        },
        () => config
    );
    return {
        allow(permission, url, requestingUrl = url) {
            const result = vi.fn();
            request({ getURL: () => url }, permission, result, { requestingUrl });
            return result.mock.calls[0]?.[0];
        },
        setConfig(next) {
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
    it("rejects clipboard writes requested by an embedded external origin", () => {
        expect(
            permissions().allow(
                "clipboard-sanitized-write",
                "https://play.example.org/@/world",
                "https://external.example.org/frame"
            )
        ).toBe(false);
    });
    it("checks the current allow-list and falls back to the world URL when needed", () => {
        const policy = permissions();
        expect(policy.allow("clipboard-sanitized-write", "https://play.example.org/@/world", "")).toBe(true);
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
