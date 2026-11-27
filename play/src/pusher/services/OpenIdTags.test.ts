import { describe, expect, it } from "vitest";
import { mapOpenIdAdminTag } from "./OpenIdTags";

describe("mapOpenIdAdminTag", () => {
    it("returns the claim unchanged when no admin tag is configured", () => {
        expect(mapOpenIdAdminTag(["admin", "editor"], undefined)).toEqual(["admin", "editor"]);
        expect(mapOpenIdAdminTag(["admin"], "")).toEqual(["admin"]);
        expect(mapOpenIdAdminTag(["admin"], "   ")).toEqual(["admin"]);
        expect(mapOpenIdAdminTag(undefined, undefined)).toBeUndefined();
    });

    it("returns the claim unchanged when the configured admin tag is 'admin'", () => {
        expect(mapOpenIdAdminTag(["admin", "editor"], "admin")).toEqual(["admin", "editor"]);
    });

    it("adds 'admin' when the provider sends the configured admin tag", () => {
        expect(mapOpenIdAdminTag(["wa-admins", "editor"], "wa-admins")).toEqual(["wa-admins", "editor", "admin"]);
    });

    it("trims the configured admin tag", () => {
        expect(mapOpenIdAdminTag(["wa-admins"], " wa-admins ")).toEqual(["wa-admins", "admin"]);
    });

    it("does not grant admin when the provider only sends 'admin'", () => {
        expect(mapOpenIdAdminTag(["admin", "editor"], "wa-admins")).toEqual(["editor"]);
    });

    it("leaves users without the configured admin tag unchanged", () => {
        expect(mapOpenIdAdminTag(["editor"], "wa-admins")).toEqual(["editor"]);
        expect(mapOpenIdAdminTag([], "wa-admins")).toEqual([]);
    });

    it("compares tags case-sensitively", () => {
        expect(mapOpenIdAdminTag(["WA-Admins"], "wa-admins")).toEqual(["WA-Admins"]);
    });

    it("reads a tags claim sent as a JSON-encoded array", () => {
        expect(mapOpenIdAdminTag('["wa-admins","editor"]', "wa-admins")).toEqual(["wa-admins", "editor", "admin"]);
    });

    it("reads a tags claim sent as a single string", () => {
        expect(mapOpenIdAdminTag("wa-admins", "wa-admins")).toEqual(["wa-admins", "admin"]);
        expect(mapOpenIdAdminTag("admin", "wa-admins")).toEqual([]);
    });

    it("keeps the valid string tags when the array contains non-string values", () => {
        expect(mapOpenIdAdminTag(["wa-admins", 42, null], "wa-admins")).toEqual(["wa-admins", "admin"]);
    });

    it("ignores a tags claim that is neither an array nor a string", () => {
        expect(mapOpenIdAdminTag(42, "wa-admins")).toEqual([]);
        expect(mapOpenIdAdminTag({ tag: "wa-admins" }, "wa-admins")).toEqual([]);
    });

    it("returns undefined when the provider sends no tags claim", () => {
        expect(mapOpenIdAdminTag(undefined, "wa-admins")).toBeUndefined();
        expect(mapOpenIdAdminTag(null, "wa-admins")).toBeUndefined();
    });
});
