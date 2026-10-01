const test = require("node:test");
const assert = require("node:assert/strict");

const {
    MAX_TRUSTED_SERVERS,
    addTrustedServer,
    trustableOrigin,
    VERIFIED_ORIGIN_TTL_MS,
    activeVerifiedOrigins,
    rememberVerifiedOrigin,
    verifyOriginRequestUrl,
} = require("./verified-origins-policy");

test("a confirmed origin is trusted until its confirmation expires", () => {
    const stored = rememberVerifiedOrigin({}, "https://acme.example", 1000);
    assert.deepEqual(activeVerifiedOrigins(stored, 1000 + VERIFIED_ORIGIN_TTL_MS - 1), ["https://acme.example"]);
    assert.deepEqual(activeVerifiedOrigins(stored, 1000 + VERIFIED_ORIGIN_TTL_MS), []);
});

test("remembering an origin drops the expired ones and ignores garbage", () => {
    const stored = { "https://old.example": 5, "https://kept.example": 10_000, "https://bad.example": "x" };
    assert.deepEqual(Object.keys(rememberVerifiedOrigin(stored, "https://new.example", 100)).sort(), [
        "https://kept.example",
        "https://new.example",
    ]);
    assert.deepEqual(activeVerifiedOrigins(null), []);
    assert.deepEqual(activeVerifiedOrigins(["https://a.example"]), []);
});

test("the question is asked to the portal over https, with the target origin only", () => {
    assert.equal(
        verifyOriginRequestUrl("https://admin.workadventu.re/", "https://acme.example/@/team/world/room?token=secret"),
        "https://admin.workadventu.re/api/desktop/verify-origin?origin=https%3A%2F%2Facme.example"
    );
});

test("an http portal is only asked in development, and never about non-web URLs", () => {
    assert.equal(verifyOriginRequestUrl("http://admin.workadventure.localhost/", "https://acme.example"), undefined);
    assert.ok(verifyOriginRequestUrl("http://admin.workadventure.localhost/", "https://acme.example", true));
    assert.equal(verifyOriginRequestUrl("https://admin.workadventu.re/", "javascript:alert(1)"), undefined);
    assert.equal(verifyOriginRequestUrl("not a url", "https://acme.example"), undefined);
});

test("a self-hosted server can be added over https, http only in development", () => {
    assert.equal(trustableOrigin(" https://wa.acme.example/_/global/maps/office.tmj "), "https://wa.acme.example");
    assert.equal(trustableOrigin("http://wa.acme.example/"), undefined);
    assert.equal(trustableOrigin("http://wa.acme.example/", true), "http://wa.acme.example");
    assert.equal(trustableOrigin("https://user:pass@wa.acme.example/"), undefined);
    assert.equal(trustableOrigin("javascript:alert(1)", true), undefined);
    assert.equal(trustableOrigin("not a url"), undefined);
});

test("trusted servers are deduplicated, most recent first, and capped", () => {
    assert.deepEqual(addTrustedServer(["https://a.example", "https://b.example"], "https://b.example"), [
        "https://b.example",
        "https://a.example",
    ]);
    assert.deepEqual(addTrustedServer("garbage", "https://a.example"), ["https://a.example"]);
    const many = Array.from({ length: MAX_TRUSTED_SERVERS }, (_, i) => `https://s${i}.example`);
    const next = addTrustedServer(many, "https://new.example");
    assert.equal(next.length, MAX_TRUSTED_SERVERS);
    assert.equal(next[0], "https://new.example");
});
