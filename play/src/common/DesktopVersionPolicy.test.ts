import { describe, expect, it } from "vitest";
import {
    compareDesktopToRelease,
    desktopDownloadUrl,
    desktopVersionStatus,
    DEFAULT_DESKTOP_DOWNLOAD_URL,
} from "./DesktopVersionPolicy";

describe("instance desktop version policy", () => {
    it.each([
        ["1.10.0", "1.9.9", 1],
        ["2.0.0", "2.0.0", 0],
        ["1.0.9", "1.0.10", -1],
        ["2.0.0-rc.1", "2.0.0", -1],
        ["2.0.0+build.42", "2.0.0", 0],
        ["2.1.0-beta.2", "2.0.0", 1],
        ["dev", "2.0.0", undefined],
        ["managedbyci", "2.0.0", undefined],
        ["01.2.3", "1.2.3", undefined],
        ["1.2.3-01", "1.2.3", undefined],
        ["1.2", "1.2.3", undefined],
        ["999999999999999999.0.0", "999999999999999998.0.0", 1],
    ])("compares %s with stable release %s", (installed, release, result) => {
        expect(compareDesktopToRelease(installed, release)).toBe(result);
    });
    const policy = {
        minimumVersion: "1.2.0",
        recommendedVersion: "1.3.0",
        downloadUrl: "https://downloads.example.org/desktop",
    };
    it("prioritizes minimum support over a version recommendation", () => {
        expect(desktopVersionStatus("1.1.0", policy)).toBe("belowMinimum");
        expect(desktopVersionStatus("1.2.0", policy)).toBe("different");
        expect(desktopVersionStatus("1.3.0", policy)).toBe("recommended");
        expect(desktopVersionStatus("1.4.0", policy)).toBe("different");
        expect(desktopVersionStatus("dev", policy)).toBe("unknown");
    });
    it("does not assume a recommendation for an unconfigured instance", () => {
        expect(desktopVersionStatus("1.0.0", {})).toBe("unconfigured");
        expect(desktopDownloadUrl({})).toBe(DEFAULT_DESKTOP_DOWNLOAD_URL);
    });
    it("keeps downloads pinned to the instance instead of falling back to latest", () => {
        expect(desktopDownloadUrl(policy)).toBe(policy.downloadUrl);
        expect(desktopDownloadUrl({ recommendedVersion: "1.3.0" })).toBeUndefined();
        expect(desktopDownloadUrl({ minimumVersion: "1.2.0" })).toBeUndefined();
    });
    it.each([
        "javascript:alert(1)",
        "http://downloads.example.org",
        "https://user:secret@downloads.example.org",
        "invalid",
    ])("rejects an unsafe download URL: %s", (downloadUrl) => {
        expect(desktopDownloadUrl({ ...policy, downloadUrl })).toBeUndefined();
    });
});
