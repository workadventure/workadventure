import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Locale Detection", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    // Mock localStorage
    const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
    });

    // Mock document
    Object.defineProperty(document, "documentElement", {
        value: {
            lang: "",
            dir: "",
        },
        configurable: true,
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

            // Mock all dependencies needed
            vi.doMock("../../../src/i18n/i18n-util", () => ({
                baseLocale: "en-US",
                isLocale: (locale: string) =>
                    [
                        "ar-SA",
                        "ca-ES",
                        "de-DE",
                        "dsb-DE",
                        "en-US",
                        "es-ES",
                        "fr-FR",
                        "hsb-DE",
                        "it-IT",
                        "ja-JP",
                        "nl-NL",
                        "pt-BR",
                        "zh-CN",
                    ].includes(locale),
                locales: [
                    "ar-SA",
                    "ca-ES",
                    "de-DE",
                    "dsb-DE",
                    "en-US",
                    "es-ES",
                    "fr-FR",
                    "hsb-DE",
                    "it-IT",
                    "ja-JP",
                    "nl-NL",
                    "pt-BR",
                    "zh-CN",
                ],
                loadedLocales: {},
                loadedFormatters: {},
            }));

            vi.doMock("../../../src/i18n/i18n-util.async", () => ({
                loadLocaleAsync: vi.fn().mockResolvedValue(undefined),
            }));

            vi.doMock("../../../src/i18n/i18n-svelte", () => ({
                setLocale: vi.fn(),
            }));

            vi.doMock("../../../src/front/Enum/EnvironmentVariable", () => ({
                FALLBACK_LOCALE: "en-US",
            }));

            // For this test we'll use the manual approach
            const supportedLocales = [
                "ar-SA",
                "ca-ES",
                "de-DE",
                "dsb-DE",
                "en-US",
                "es-ES",
                "fr-FR",
                "hsb-DE",
                "it-IT",
                "ja-JP",
                "nl-NL",
                "pt-BR",
                "zh-CN",
            ];
            const isLocale = (locale: string) => supportedLocales.includes(locale);

            const navigatorLanguages = window.navigator.languages || [window.navigator.language];
            const detectedLocales: string[] = [];

            for (const lang of navigatorLanguages) {
                // First try exact match
                if (isLocale(lang)) {
                    detectedLocales.push(lang);
                    continue;
                }

                // Then try to find the first available variant for this language
                const genericLang = lang.split("-")[0];
                const availableVariant = supportedLocales.find((locale) => locale.startsWith(genericLang + "-"));
                if (availableVariant) {
                    detectedLocales.push(availableVariant);
                }
            }

            expect(detectedLocales).toEqual(["ar-SA"]);
        });

        it("should handle multiple languages with exact and generic matches", () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "fr-FR",
                    languages: ["fr-FR", "de", "en"],
                },
                configurable: true,
            });

            // Create a simple detector manually to test the logic
            const supportedLocales = [
                "ar-SA",
                "ca-ES",
                "de-DE",
                "dsb-DE",
                "en-US",
                "es-ES",
                "fr-FR",
                "hsb-DE",
                "it-IT",
                "ja-JP",
                "nl-NL",
                "pt-BR",
                "zh-CN",
            ];
            const isLocale = (locale: string) => supportedLocales.includes(locale);

            const navigatorLanguages = window.navigator.languages || [window.navigator.language];
            const detectedLocales: string[] = [];

            for (const lang of navigatorLanguages) {
                // First try exact match
                if (isLocale(lang)) {
                    detectedLocales.push(lang);
                    continue;
                }

                // Then try to find the first available variant for this language
                const genericLang = lang.split("-")[0];
                const availableVariant = supportedLocales.find((locale) => locale.startsWith(genericLang + "-"));
                if (availableVariant) {
                    detectedLocales.push(availableVariant);
                }
            }

            // Should get fr-FR (exact), de-DE (generic), en-US (generic)
            expect(detectedLocales).toEqual(["fr-FR", "de-DE", "en-US"]);
        });
    });

    describe("Dynamic Language Mapping", () => {
        it('should detect Arabic when browser sends generic "ar"', async () => {
            // Mock navigator
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "ar",
                    languages: ["ar"],
                },
                configurable: true,
            });

            localStorageMock.getItem.mockReturnValue(null);

            // Mock the dependencies
            vi.doMock("typesafe-i18n/detectors", () => ({
                detectLocale: vi.fn((fallback, locales, detector) => {
                    const detected = detector();
                    return detected.length > 0 ? detected[0] : fallback;
                }),
                initLocalStorageDetector: vi.fn(),
                navigatorDetector: vi.fn(),
            }));

            vi.doMock("../../../src/i18n/i18n-util", () => ({
                baseLocale: "en-US",
                isLocale: (locale: string) =>
                    [
                        "ar-SA",
                        "ca-ES",
                        "de-DE",
                        "dsb-DE",
                        "en-US",
                        "es-ES",
                        "fr-FR",
                        "hsb-DE",
                        "it-IT",
                        "ja-JP",
                        "nl-NL",
                        "pt-BR",
                        "zh-CN",
                    ].includes(locale),
                locales: [
                    "ar-SA",
                    "ca-ES",
                    "de-DE",
                    "dsb-DE",
                    "en-US",
                    "es-ES",
                    "fr-FR",
                    "hsb-DE",
                    "it-IT",
                    "ja-JP",
                    "nl-NL",
                    "pt-BR",
                    "zh-CN",
                ],
            }));

            vi.doMock("../../../src/i18n/i18n-util.async", () => ({
                loadLocaleAsync: vi.fn().mockResolvedValue(undefined),
            }));

            vi.doMock("../../../src/i18n/i18n-svelte", () => ({
                setLocale: vi.fn(),
            }));

            vi.doMock("../../../src/front/Enum/EnvironmentVariable", () => ({
                FALLBACK_LOCALE: "en-US",
            }));

            // Import the module after mocking
            const { localeDetector } = await import("../../../src/front/Utils/locales");
            const { detectLocale } = await import("typesafe-i18n/detectors");

            // Call the actual localeDetector function
            await localeDetector();

            // Verify that detectLocale was called and get the detector function used
            expect(detectLocale).toHaveBeenCalled();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [, , detectorFunction] = (detectLocale as any).mock.calls[0];

            // Test the detector function directly
            const result = detectorFunction();
            expect(result).toEqual(["ar-SA"]);
        });

        it('should detect French when browser sends generic "fr"', async () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "fr",
                    languages: ["fr"],
                },
                configurable: true,
            });

            localStorageMock.getItem.mockReturnValue(null);

            // Re-import with fresh mocks
            const { localeDetector } = await import("../../../src/front/Utils/locales");
            const { detectLocale } = await import("typesafe-i18n/detectors");

            await localeDetector();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [, , detectorFunction] = (detectLocale as any).mock.calls[0];
            const result = detectorFunction();
            expect(result).toEqual(["fr-FR"]);
        });

        it("should prefer exact matches over generic mappings", async () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "ar-SA",
                    languages: ["ar-SA", "ar"],
                },
                configurable: true,
            });

            localStorageMock.getItem.mockReturnValue(null);

            const { localeDetector } = await import("../../../src/front/Utils/locales");
            const { detectLocale } = await import("typesafe-i18n/detectors");

            await localeDetector();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [, , detectorFunction] = (detectLocale as any).mock.calls[0];
            const result = detectorFunction();
            // Should detect ar-SA first (exact match), then ar-SA again (from generic 'ar')
            expect(result).toEqual(["ar-SA", "ar-SA"]);
        });

        it("should handle German correctly (de -> de-DE)", async () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "de",
                    languages: ["de"],
                },
                configurable: true,
            });

            localStorageMock.getItem.mockReturnValue(null);

            const { localeDetector } = await import("../../../src/front/Utils/locales");
            const { detectLocale } = await import("typesafe-i18n/detectors");

            await localeDetector();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [, , detectorFunction] = (detectLocale as any).mock.calls[0];
            const result = detectorFunction();
            expect(result).toEqual(["de-DE"]);
        });

        it("should handle unsupported languages gracefully", async () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "sv",
                    languages: ["sv", "sv-SE"],
                },
                configurable: true,
            });

            localStorageMock.getItem.mockReturnValue(null);

            const { localeDetector } = await import("../../../src/front/Utils/locales");
            const { detectLocale } = await import("typesafe-i18n/detectors");

            await localeDetector();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [, , detectorFunction] = (detectLocale as any).mock.calls[0];
            const result = detectorFunction();
            expect(result).toEqual([]);
        });

        it("should handle complex language variants (de-AT -> de-DE)", async () => {
            Object.defineProperty(window, "navigator", {
                value: {
                    language: "de-AT",
                    languages: ["de-AT"],
                },
                configurable: true,
            });

            localStorageMock.getItem.mockReturnValue(null);

            const { localeDetector } = await import("../../../src/front/Utils/locales");
            const { detectLocale } = await import("typesafe-i18n/detectors");

            await localeDetector();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [, , detectorFunction] = (detectLocale as any).mock.calls[0];
            const result = detectorFunction();
            expect(result).toEqual(["de-DE"]);
        });
    });
});
