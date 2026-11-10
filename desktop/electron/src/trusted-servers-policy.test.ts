import { expect, test } from "vitest";
import {
    MAX_TRUSTED_SERVERS,
    addTrustedServer,
    isWorkAdventureServerInfo,
    removeTrustedServer,
    trustableOrigin,
} from "./trusted-servers-policy";

test("only a body shaped like WorkAdventure's /server.json counts as a WorkAdventure server", () => {
    expect(isWorkAdventureServerInfo({ version: "1.0.0" })).toBe(true);
    // What servers released before the /server.json clean-up answer.
    expect(
        isWorkAdventureServerInfo({
            domain: "https://pusher.acme.example",
            name: "WorkAdventure Server",
            motd: "A WorkAdventure Server",
            icon: "https://pusher.acme.example/static/images/favicons/icon-512x512.png",
            version: "1.0.0",
        })
    ).toBe(true);
    expect(isWorkAdventureServerInfo({ name: "WorkAdventure Server" })).toBe(false);
    expect(isWorkAdventureServerInfo({ version: 1 })).toBe(false);
    expect(isWorkAdventureServerInfo([])).toBe(false);
    expect(isWorkAdventureServerInfo(null)).toBe(false);
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
