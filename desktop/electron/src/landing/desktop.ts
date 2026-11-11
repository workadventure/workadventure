import type { WorkAdventureDesktopApi } from "@workadventure/desktop-api";

const wad = (window as Window & { WAD?: WorkAdventureDesktopApi }).WAD;
export const navigation = wad?.navigation;
export const screenPermission = wad?.screenPermission;

// Strings in the OS language (native catalog in the main process), fetched synchronously so the
// page never flashes English. The English passed to t() is the fallback.
let strings: Record<string, string> = {};
try {
    const native = navigation?.getStrings?.();
    if (native?.strings) {
        strings = native.strings;
        document.documentElement.lang = native.lang || "en";
        document.documentElement.dir = /^(ar|fa|he|ur)([-_]|$)/i.test(native.lang || "") ? "rtl" : "ltr";
    }
} catch (err) {
    console.warn("Landing: strings unavailable", err);
}

export function t(key: string, fallback: string): string {
    return typeof strings[key] === "string" ? strings[key] : fallback;
}

/** Waits for a desktop call that answers `{ ok, error }`: the message to show, or "" when it went through. */
export async function failureOf(
    call: Promise<{ ok: boolean; error?: string } | null | undefined> | undefined,
    fallback: string
): Promise<string> {
    try {
        const result = await call;
        return result?.ok ? "" : result?.error || fallback;
    } catch (err) {
        console.warn("Landing: desktop call rejected", err);
        return (err instanceof Error && err.message) || fallback;
    }
}
