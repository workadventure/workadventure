import { expect, test } from "vitest";
import { isPlausibleEmail, loginUrlWithHint, MAX_FOUND_WORLDS, parseFoundWorlds } from "./find-worlds-policy";

const world = {
    name: "Acme HQ",
    organization: "Acme",
    url: "https://play.workadventu.re/@/acme/hq/lobby",
    loginUrl: "https://play.workadventu.re/login-screen?playUri=x&manuallyTriggered=true",
};

test("keeps well-formed worlds and drops the rest", () => {
    expect(
        parseFoundWorlds({
            worlds: [
                world,
                { ...world, name: 42 },
                { ...world, url: "javascript:alert(1)" },
                { ...world, loginUrl: "workadventure://auth/callback" },
                { ...world, organization: undefined },
                "nope",
            ],
        })
    ).toEqual([world, { ...world, organization: "" }]);
});

test("keeps a web thumbnail and drops any other", () => {
    const thumbnail = "https://maps.example.com/office/map.png";
    expect(
        parseFoundWorlds({
            worlds: [
                { ...world, thumbnail },
                { ...world, thumbnail: null },
                { ...world, thumbnail: "javascript:alert(1)" },
                { ...world, thumbnail: "map.png" },
            ],
        })
    ).toEqual([{ ...world, thumbnail }, world, world, world]);
});

test("an unexpected body is no worlds", () => {
    expect(parseFoundWorlds(null)).toEqual([]);
    expect(parseFoundWorlds({ worlds: "x" })).toEqual([]);
    expect(parseFoundWorlds([world])).toEqual([]);
});

test("caps the list", () => {
    expect(parseFoundWorlds({ worlds: Array(MAX_FOUND_WORLDS + 5).fill(world) })).toHaveLength(MAX_FOUND_WORLDS);
});

test("adds the email as login_hint, keeping the other parameters", () => {
    const url = new URL(loginUrlWithHint(world.loginUrl, "ana+wa@acme.com"));
    expect(url.searchParams.get("login_hint")).toBe("ana+wa@acme.com");
    expect(url.searchParams.get("playUri")).toBe("x");
    expect(url.pathname).toBe("/login-screen");
});

test("email plausibility", () => {
    expect(isPlausibleEmail("ana@acme.com")).toBe(true);
    expect(isPlausibleEmail("ana@acme")).toBe(false);
    expect(isPlausibleEmail("ana acme@acme.com")).toBe(false);
    expect(isPlausibleEmail(42)).toBe(false);
    expect(isPlausibleEmail(`${"a".repeat(250)}@acme.com`)).toBe(false);
});
