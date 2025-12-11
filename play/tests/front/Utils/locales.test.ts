import { describe, it, expect, beforeEach } from "vitest";
import { createCustomNavigatorDetector, setCurrentLocale } from "../../../src/front/Utils/locales";

describe("Locale Detection", () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Reset document properties
        document.documentElement.lang = "";
        document.documentElement.dir = "";
    });

    describe("createCustomNavigatorDetector (Unit Tests)", () => {
        it("should directly test the detector function with Arabic", () => {
            // Mock navigator
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "ar",
                    languages: ["ar"],
                },
                configurable: true,
            });

            const detector = createCustomNavigatorDetector();
            const result = detector();
            expect(result).toEqual(["ar-SA"]);
        });

        it("should handle multiple languages with exact and generic matches", () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "fr-FR",
                    languages: ["fr-FR", "de", "en"],
                },
                configurable: true,
            });

            const detector = createCustomNavigatorDetector();
            const result = detector();
            // Should get fr-FR (exact), de-DE (generic), en-US (generic)
            expect(result).toEqual(["fr-FR", "de-DE", "en-US"]);
        });
    });

    describe("Locale Detection and Application", () => {
        it('should detect Arabic when browser sends generic "ar"', () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "ar",
                    languages: ["ar"],
                },
                configurable: true,
            });

            const detector = createCustomNavigatorDetector();
            const result = detector();
            expect(result).toEqual(["ar-SA"]);
        });

        it('should detect French when browser sends generic "fr"', () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "fr",
                    languages: ["fr"],
                },
                configurable: true,
            });

            const detector = createCustomNavigatorDetector();
            const result = detector();
            expect(result).toEqual(["fr-FR"]);
        });

        it("should prefer exact matches over generic mappings", () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "ar-SA",
                    languages: ["ar-SA", "ar"],
                },
                configurable: true,
            });

            const detector = createCustomNavigatorDetector();
            const result = detector();
            // Should detect ar-SA first (exact match), then ar-SA again (from generic 'ar')
            expect(result).toEqual(["ar-SA", "ar-SA"]);
        });

        it("should handle German correctly (de -> de-DE)", () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "de",
                    languages: ["de"],
                },
                configurable: true,
            });

            const detector = createCustomNavigatorDetector();
            const result = detector();
            expect(result).toEqual(["de-DE"]);
        });

        it("should handle unsupported languages gracefully", () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "sv",
                    languages: ["sv", "sv-SE"],
                },
                configurable: true,
            });

            const detector = createCustomNavigatorDetector();
            const result = detector();
            expect(result).toEqual([]);
        });

        it("should handle complex language variants (de-AT -> de-DE)", () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "de-AT",
                    languages: ["de-AT"],
                },
                configurable: true,
            });

            const detector = createCustomNavigatorDetector();
            const result = detector();
            expect(result).toEqual(["de-DE"]);
        });
    });

    describe("setCurrentLocale", () => {
        it("should set locale in localStorage and update document properties for Arabic", async () => {
            await setCurrentLocale("ar-SA");

            expect(localStorage.getItem("language")).toBe("ar-SA");
            expect(document.documentElement.lang).toBe("ar-SA");
            expect(document.documentElement.dir).toBe("rtl");
        });

        it("should set locale in localStorage and update document properties for French", async () => {
            await setCurrentLocale("fr-FR");

            expect(localStorage.getItem("language")).toBe("fr-FR");
            expect(document.documentElement.lang).toBe("fr-FR");
            expect(document.documentElement.dir).toBe("ltr");
        });
    });
});
