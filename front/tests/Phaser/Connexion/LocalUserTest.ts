import "jasmine";
import {areCharacterLayersValid, isUserNameValid, maxUserNameLength} from "../../../src/Connexion/LocalUser";

describe("isUserNameValid()", () => {
    it("should validate name with letters", () => {
        expect(isUserNameValid('toto')).toBe(true);
    });

    it("should not validate empty name", () => {
        expect(isUserNameValid('')).toBe(false);
    });
    it("should not validate string with too many letters", () => {
        let testString = '';
        for (let i = 0; i < maxUserNameLength + 2; i++) {
            testString += 'a';
        }
        expect(isUserNameValid(testString)).toBe(false);
    });
    it("should not validate spaces", () => {
        expect(isUserNameValid(' ')).toBe(false);
    });
    it("should not validate numbers", () => {
        expect(isUserNameValid('a12')).toBe(false);
    });
    it("should not validate special characters", () => {
        expect(isUserNameValid('a&-')).toBe(false);
    });
});

describe("areCharacterLayersValid()", () => {
    it("should validate default textures array", () => {
        expect(areCharacterLayersValid(['male1', 'male2'])).toBe(true);
    });

    it("should not validate an empty array", () => {
        expect(areCharacterLayersValid([])).toBe(false);
    });
    it("should not validate space only strings", () => {
        expect(areCharacterLayersValid([' ', 'male1'])).toBe(false);
    });

    it("should not validate empty strings", () => {
        expect(areCharacterLayersValid(['', 'male1'])).toBe(false);
    });
});