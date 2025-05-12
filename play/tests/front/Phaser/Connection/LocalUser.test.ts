// @vitest-environment jsdom
//@ts-ignore Forcing environment variables in global object
window.env = {
    MAX_USERNAME_LENGTH: 10,
    DEBUG_MODE: true,
};

import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/front/Enum/EnvironmentVariable.ts", () => {
    return {
        MAX_USERNAME_LENGTH: 10,
    };
});

import {
    areCharacterTexturesValid,
    isUserNameValid,
    maxUserNameLength,
} from "../../../../src/front/Connection/LocalUserUtils";

describe("isUserNameValid()", () => {
    it("should validate name with letters", () => {
        expect(isUserNameValid("toto")).toBe(true);
    });

    it("should not validate empty name", () => {
        expect(isUserNameValid("")).toBe(false);
    });
    it("should not validate string with too many letters", () => {
        let testString = "";
        for (let i = 0; i < maxUserNameLength + 2; i++) {
            testString += "a";
        }
        expect(isUserNameValid(testString)).toBe(false);
    });
    it("should not validate spaces", () => {
        expect(isUserNameValid(" ")).toBe(false);
    });
    it("should validate special characters", () => {
        expect(isUserNameValid("%&-")).toBe(true);
    });
    it("should validate accents", () => {
        expect(isUserNameValid("éàëè")).toBe(true);
    });
    it("should validate chinese characters", () => {
        expect(isUserNameValid("中文鍵盤")).toBe(true);
    });
});

describe("areCharacterTextureValid()", () => {
    it("should validate default textures array", () => {
        expect(areCharacterTexturesValid(["male1", "male2"])).toBe(true);
    });

    it("should not validate an empty array", () => {
        expect(areCharacterTexturesValid([])).toBe(false);
    });
    it("should not validate space only strings", () => {
        expect(areCharacterTexturesValid([" ", "male1"])).toBe(false);
    });

    it("should not validate empty strings", () => {
        expect(areCharacterTexturesValid(["", "male1"])).toBe(false);
    });
});
