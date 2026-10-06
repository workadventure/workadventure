import { expect, test } from "vitest";
import { MAX_TRUSTED_SERVERS, addTrustedServer, removeTrustedServer, trustableOrigin, VERIFIED_ORIGIN_TTL_MS, activeVerifiedOrigins, rememberVerifiedOrigin, verifyOriginRequestUrl } from "./verified-origins-policy";

test("a confirmed origin is trusted until its confirmation expires", () => {
    const stored = rememberVerifiedOrigin({}, "https://acme.example", 1000);
    expect(activeVerifiedOrigins(stored, 1000 + VERIFIED_ORIGIN_TTL_MS - 1)).toStrictEqual(["https://acme.example"]);
    expect(activeVerifiedOrigins(stored, 1000 + VERIFIED_ORIGIN_TTL_MS)).toStrictEqual([]);
});

test("remembering an origin drops the expired ones and ignores garbage", () => {
    const stored = { "https://old.example": 5, "https://kept.example": 10_000, "https://bad.example": "x" };
    expect(Object.keys(rememberVerifiedOrigin(stored, "https://new.example", 100)).sort()).toStrictEqual([
        "https://kept.example",
        "https://new.example",
    ]);
    expect(activeVerifiedOrigins(null)).toStrictEqual([]);
    expect(activeVerifiedOrigins(["https://a.example"])).toStrictEqual([]);
});

test("the question is asked to the portal over https, with the target origin only", () => {
    expect(verifyOriginRequestUrl("https://admin.workadventu.re/", "https://acme.example/@/team/world/room?token=secret")).toBe("https://admin.workadventu.re/api/desktop/verify-origin?origin=https%3A%2F%2Facme.example");
});

test("an http portal is only asked in development, and never about non-web URLs", () => {
    expect(verifyOriginRequestUrl("http://admin.workadventure.localhost/", "https://acme.example")).toBe(undefined);
    expect(verifyOriginRequestUrl("http://admin.workadventure.localhost/", "https://acme.example", true)).toBeTruthy();
    expect(verifyOriginRequestUrl("https://admin.workadventu.re/", "javascript:alert(1)")).toBe(undefined);
    expect(verifyOriginRequestUrl("not a url", "https://acme.example")).toBe(undefined);
});

test("a self-hosted server can be added over https, http only in development", () => {
    expect(trustableOrigin(" https://wa.acme.example/_/global/maps/office.tmj ")).toBe("https://wa.acme.example");
    expect(trustableOrigin("http://wa.acme.example/")).toBe(undefined);
    expect(trustableOrigin("http://wa.acme.example/", true)).toBe("http://wa.acme.example");
    expect(trustableOrigin("https://user:pass@wa.acme.example/")).toBe(undefined);
    expect(trustableOrigin("javascript:alert(1)", true)).toBe(undefined);
    expect(trustableOrigin("not a url")).toBe(undefined);
});

test("trusted servers are deduplicated, most recent first, and capped", () => {
    expect(addTrustedServer(["https://a.example", "https://b.example"], "https://b.example")).toStrictEqual([
        "https://b.example",
        "https://a.example",
    ]);
    expect(addTrustedServer("garbage", "https://a.example")).toStrictEqual(["https://a.example"]);
    const many = Array.from({ length: MAX_TRUSTED_SERVERS }, (_, i) => `https://s${i}.example`);
    const next = addTrustedServer(many, "https://new.example");
    expect(next.length).toBe(MAX_TRUSTED_SERVERS);
    expect(next[0]).toBe("https://new.example");
});

test("a trusted server can be removed", () => {
    expect(removeTrustedServer(["https://a.example", "https://b.example"], "https://a.example")).toStrictEqual([
        "https://b.example",
    ]);
    expect(removeTrustedServer(undefined, "https://a.example")).toStrictEqual([]);
});
