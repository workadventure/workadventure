import { describe, expect, it } from "vitest";
import { ValidatedEnvironmentVariables } from "../../src/pusher/enums/EnvironmentVariableValidator";

const base = {
    SECRET_KEY: "test-secret",
    API_URL: "http://back:50051",
    MAP_STORAGE_API_TOKEN: "test-token",
    UPLOADER_URL: "https://uploader.example.org",
    ICON_URL: "https://icon.example.org",
};
describe("desktop instance configuration", () => {
    it("accepts an unconfigured instance and empty optional settings", () => {
        expect(ValidatedEnvironmentVariables.safeParse(base).success).toBe(true);
        expect(
            ValidatedEnvironmentVariables.safeParse({
                ...base,
                DESKTOP_APP_RECOMMENDED_VERSION: "",
                DESKTOP_APP_MINIMUM_VERSION: "",
                DESKTOP_APP_DOWNLOAD_URL: "",
            }).success,
        ).toBe(true);
    });
    it("accepts a release recommendation with its approved download page", () => {
        expect(
            ValidatedEnvironmentVariables.safeParse({
                ...base,
                DESKTOP_APP_RECOMMENDED_VERSION: "1.3.0",
                DESKTOP_APP_MINIMUM_VERSION: "1.2.0",
                DESKTOP_APP_DOWNLOAD_URL: "https://downloads.example.org/desktop",
            }).success,
        ).toBe(true);
    });
    it.each([
        { DESKTOP_APP_RECOMMENDED_VERSION: "1.3.0", DESKTOP_APP_DOWNLOAD_URL: undefined },
        { DESKTOP_APP_MINIMUM_VERSION: "1.2.0", DESKTOP_APP_DOWNLOAD_URL: undefined },
        { DESKTOP_APP_RECOMMENDED_VERSION: "1.3" },
        { DESKTOP_APP_RECOMMENDED_VERSION: "latest" },
        { DESKTOP_APP_RECOMMENDED_VERSION: "1.3.0-beta.1" },
        { DESKTOP_APP_RECOMMENDED_VERSION: "1.2.0", DESKTOP_APP_MINIMUM_VERSION: "1.3.0" },
        { DESKTOP_APP_DOWNLOAD_URL: "javascript:alert(1)" },
        { DESKTOP_APP_DOWNLOAD_URL: "http://downloads.example.org" },
        { DESKTOP_APP_DOWNLOAD_URL: "https://user:password@downloads.example.org" },
    ])("rejects invalid policy %j", (policy) => {
        expect(
            ValidatedEnvironmentVariables.safeParse({
                ...base,
                DESKTOP_APP_DOWNLOAD_URL: "https://downloads.example.org/desktop",
                ...policy,
            }).success,
        ).toBe(false);
    });
});
