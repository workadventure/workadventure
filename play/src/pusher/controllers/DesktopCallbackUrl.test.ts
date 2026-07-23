import { describe, expect, it } from "vitest";
import { normalizeDesktopCallbackUrl } from "./DesktopCallbackUrl";

// crypto.randomBytes(32|16).toString("hex") on the desktop side.
const secret = "a".repeat(64);
const state = "b".repeat(32);

describe("normalizeDesktopCallbackUrl", () => {
    it("accepts the desktop loopback callback with the CSRF secret path segment", () => {
        // This is the shape the Electron app actually sends; it must survive so the pusher redirects
        // the auth window to the loopback server instead of the dead workadventure:// fallback.
        const url = `http://127.0.0.1:54123/auth/callback/${secret}?state=${state}`;
        expect(normalizeDesktopCallbackUrl(url)).toBe(url);
    });

    it("accepts the logout loopback callback with the secret segment", () => {
        const url = `http://127.0.0.1:54123/logout/callback/${secret}?state=${state}`;
        expect(normalizeDesktopCallbackUrl(url)).toBe(url);
    });

    it("preserves the state query param", () => {
        const url = `http://localhost:5/auth/callback/${secret}?state=${state}`;
        expect(normalizeDesktopCallbackUrl(url)).toContain(`state=${state}`);
    });

    it("accepts the bare callback path (no secret) for backward compatibility", () => {
        expect(normalizeDesktopCallbackUrl("http://127.0.0.1:48919/auth/callback")).toBe(
            "http://127.0.0.1:48919/auth/callback"
        );
        expect(normalizeDesktopCallbackUrl("http://localhost:48919/logout/callback")).toBe(
            "http://localhost:48919/logout/callback"
        );
    });

    it("rejects non-loopback hosts (open-redirect / SSRF guard)", () => {
        expect(normalizeDesktopCallbackUrl(`http://evil.example.com/auth/callback/${secret}`)).toBeUndefined();
        expect(normalizeDesktopCallbackUrl(`http://169.254.169.254/auth/callback/${secret}`)).toBeUndefined();
    });

    it("rejects non-http protocols", () => {
        expect(normalizeDesktopCallbackUrl(`https://127.0.0.1/auth/callback/${secret}`)).toBeUndefined();
        expect(normalizeDesktopCallbackUrl("workadventure://auth/callback")).toBeUndefined();
    });

    it("rejects unexpected paths and extra segments", () => {
        expect(normalizeDesktopCallbackUrl("http://127.0.0.1/evil")).toBeUndefined();
        expect(normalizeDesktopCallbackUrl(`http://127.0.0.1/auth/callback/${secret}/extra`)).toBeUndefined();
        expect(normalizeDesktopCallbackUrl(`http://127.0.0.1/auth/notcallback/${secret}`)).toBeUndefined();
    });

    it("rejects a non-hex secret segment", () => {
        expect(normalizeDesktopCallbackUrl(`http://127.0.0.1/auth/callback/${"g".repeat(64)}`)).toBeUndefined();
        expect(normalizeDesktopCallbackUrl("http://127.0.0.1/auth/callback/short")).toBeUndefined();
    });

    it("returns undefined for empty or malformed input", () => {
        expect(normalizeDesktopCallbackUrl(undefined)).toBeUndefined();
        expect(normalizeDesktopCallbackUrl("")).toBeUndefined();
        expect(normalizeDesktopCallbackUrl("not a url")).toBeUndefined();
    });
});
