import type { DesktopFoundWorld } from "@workadventure/desktop-api";

export const MAX_FOUND_WORLDS = 50;

/** A world from the administration's lookup, with its sign-in URL (which the Landing never sees). */
export type FoundWorld = DesktopFoundWorld & { loginUrl: string };

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isHttpUrl(value: unknown): value is string {
    if (typeof value !== "string") {
        return false;
    }
    try {
        const { protocol } = new URL(value);
        return protocol === "https:" || protocol === "http:";
    } catch {
        return false;
    }
}

/** Good enough to send to the administration, which validates it for real. */
export function isPlausibleEmail(value: unknown): value is string {
    return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** The worlds in the administration's answer to POST /api/desktop/worlds, malformed entries dropped. */
export function parseFoundWorlds(body: unknown): FoundWorld[] {
    const entries = isRecord(body) && Array.isArray(body.worlds) ? body.worlds : [];
    const worlds: FoundWorld[] = [];
    for (const entry of entries) {
        if (!isRecord(entry) || typeof entry.name !== "string" || !isHttpUrl(entry.url) || !isHttpUrl(entry.loginUrl)) {
            continue;
        }
        worlds.push({
            name: entry.name,
            organization: typeof entry.organization === "string" ? entry.organization : "",
            url: entry.url,
            loginUrl: entry.loginUrl,
        });
        if (worlds.length === MAX_FOUND_WORLDS) {
            break;
        }
    }
    return worlds;
}

/** The sign-in URL with the email the user typed, so the login page does not ask for it again. */
export function loginUrlWithHint(loginUrl: string, email: string): string {
    const url = new URL(loginUrl);
    url.searchParams.set("login_hint", email);
    return url.toString();
}
