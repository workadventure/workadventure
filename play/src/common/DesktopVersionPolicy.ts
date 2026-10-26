/** Product versions are separate from the desktop bridge contract. */
export const DESKTOP_RELEASE_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const installedPattern =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;
export const DEFAULT_DESKTOP_DOWNLOAD_URL = "https://github.com/workadventure/workadventure/releases/latest";
export type DesktopVersionPolicy = {
    recommendedVersion?: string;
    minimumVersion?: string;
    downloadUrl?: string;
};

function compareNumeric(left: string, right: string): number {
    if (left.length !== right.length) return left.length < right.length ? -1 : 1;
    if (left === right) return 0;
    return left < right ? -1 : 1;
}

/** Compare a running desktop (including prereleases) to an exact stable release. */
export function compareDesktopToRelease(installed: string, release: string): number | undefined {
    const match = installedPattern.exec(installed);
    const target = DESKTOP_RELEASE_PATTERN.exec(release);
    if (!match || !target) return undefined;
    for (let index = 1; index <= 3; index++) {
        const left = match[index];
        const right = target[index];
        if (left === undefined || right === undefined) return undefined;
        const difference = compareNumeric(left, right);
        if (difference) return difference;
    }
    return match[4] ? -1 : 0;
}

export type DesktopVersionStatus = "unknown" | "belowMinimum" | "recommended" | "different" | "unconfigured";

export function desktopVersionStatus(
    installed: string | undefined,
    policy: DesktopVersionPolicy,
): DesktopVersionStatus {
    if (!installed || compareDesktopToRelease(installed, "0.0.0") === undefined) return "unknown";
    if (policy.minimumVersion && compareDesktopToRelease(installed, policy.minimumVersion) === -1)
        return "belowMinimum";
    if (policy.recommendedVersion)
        return compareDesktopToRelease(installed, policy.recommendedVersion) === 0 ? "recommended" : "different";
    return "unconfigured";
}

export function desktopDownloadUrl(policy: DesktopVersionPolicy): string | undefined {
    if (policy.downloadUrl) {
        try {
            const url = new URL(policy.downloadUrl);
            return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
        } catch {
            return undefined;
        }
    }
    // Never send an installation with a pinned version to an unrelated "latest" release.
    return policy.recommendedVersion || policy.minimumVersion ? undefined : DEFAULT_DESKTOP_DOWNLOAD_URL;
}
