import type { AnalyticsEventProperties } from "@workadventure/messages";

/**
 * How a cowebsite URL becomes analytics properties — and, mostly, what it must not
 * become.
 *
 * Pulled out of AnalyticsClient because none of it is about analytics plumbing: it
 * is a privacy projection over a URL, and it was a quarter of that class. Pure
 * functions over strings, so unlike everything they used to sit next to, they can
 * be tested without a singleton, a socket or a capability.
 *
 * The rule they all serve: a document's name is reported in exactly one field,
 * `fileName`, and nowhere else. One field can be dropped by the admin's
 * anonymization allowlist and by the Kiosk projection; a name buried in a URL
 * cannot be dropped by anything.
 */
export type CowebsiteMediaKind =
    | "pdf"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "presentation"
    | "spreadsheet"
    | "website"
    | "other";

export type CowebsiteOpenedAnalyticsContext = {
    targetUrl?: string;
    mediaKind?: CowebsiteMediaKind;
    triggerProperty?: "openLink" | "openWebsite" | "other";
    fileName?: string;
    fileExtension?: string;
    areaId?: string;
    areaName?: string;
    schemaVersion?: number;
};

export function buildCowebsiteOpenedProperties(
    url: URL,
    context: CowebsiteOpenedAnalyticsContext,
): AnalyticsEventProperties<"cowebsite.opened"> {
    const rawTargetUrl = context.targetUrl ?? url.toString();
    const fileExtension = normalizeFileExtension(context.fileExtension ?? getFileExtensionFromUrl(rawTargetUrl));
    const mediaKind = context.mediaKind ?? inferCowebsiteMediaKind(rawTargetUrl, fileExtension);

    return {
        // Origin only. The query and hash carry auth tokens (access_token, sas,
        // signed URLs) and the rest of the path carries whatever else the URL
        // encodes, none of which analytics needs — the document name is reported
        // on its own below, so the path would only be a second, unfiltered copy.
        url: stripUrlToOrigin(url),
        targetUrl: stripUrlToOrigin(rawTargetUrl),
        mediaKind,
        triggerProperty: context.triggerProperty ?? "other",
        // Which documents a world opens is a metric its own administrator asks
        // for, so the name is reported as its own field rather than smuggled
        // inside a URL. It is deliberately absent from the admin's anonymization
        // allowlist: document names are frequently sensitive (NDA-acme.pdf,
        // salary-2026.xlsx), so a world that opts out of user-level activity has
        // them stripped at ingestion, and the internal Kiosk does not project the
        // column at all — only the world's own back-office shows it.
        fileName: context.fileName ?? getFileNameFromUrl(rawTargetUrl),
        fileExtension,
        areaId: context.areaId,
        areaName: context.areaName,
        schemaVersion: context.schemaVersion ?? 1,
    };
}

/**
 * Drops the query string and hash, which routinely carry auth tokens
 * (access_token, sas, signed URLs). The path is kept on purpose: for a map
 * URL it *is* the analytic signal — it names which map was loaded, and every
 * map would otherwise collapse onto its host.
 *
 * Not suitable for URLs the user chose: use stripUrlToOrigin for those.
 */
export function stripUrlSensitiveParts(input: string | URL): string {
    try {
        const parsed = input instanceof URL ? input : new URL(input, window.location.origin);
        return parsed.origin + parsed.pathname;
    } catch {
        return typeof input === "string" ? input.split("?")[0].split("#")[0] : input.toString();
    }
}

/**
 * Reduces a user-chosen URL (an opened cowebsite) to its origin.
 *
 * The path is dropped as well as the query and hash, because it ends in the
 * document name — keeping it re-introduced exactly the filenames this class
 * refuses to collect (see buildCowebsiteOpenedProperties). getFileNameFromUrl
 * below derives the name from nothing but that path, and the admin ran the
 * very same extraction on the URL we shipped, so stripping fileName alone
 * achieved nothing. The origin answers the analytic question — which apps do
 * worlds open — without naming the document.
 */
export function stripUrlToOrigin(input: string | URL): string {
    try {
        const parsed = input instanceof URL ? input : new URL(input, window.location.origin);
        return parsed.origin;
    } catch {
        // Unparseable: return the scheme+host prefix rather than the raw
        // string, which would leak the path we just refused to send.
        const asString = typeof input === "string" ? input : input.toString();
        const schemeMatch = asString
            .split("?")[0]
            .split("#")[0]
            .match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i);
        return schemeMatch ? schemeMatch[0] : "";
    }
}

function getFileNameFromUrl(targetUrl: string): string | null {
    try {
        const pathname = new URL(targetUrl, window.location.origin).pathname;
        const segments = pathname.split("/").filter(Boolean);
        if (segments.length === 0) {
            return null;
        }

        return decodeURIComponent(segments[segments.length - 1] ?? "") || null;
    } catch (error) {
        console.debug("Unable to extract cowebsite file name", error);
        return null;
    }
}

function getFileExtensionFromUrl(targetUrl: string): string | null {
    const fileName = getFileNameFromUrl(targetUrl);
    if (!fileName || !fileName.includes(".")) {
        return null;
    }

    return normalizeFileExtension(fileName.split(".").pop() ?? null);
}

function normalizeFileExtension(extension: string | null | undefined): string | null {
    if (!extension) {
        return null;
    }

    return extension.trim().replace(/^\./, "").toLowerCase() || null;
}

function inferCowebsiteMediaKind(targetUrl: string, fileExtension: string | null): CowebsiteMediaKind {
    if (!fileExtension) {
        return looksLikeWebsiteUrl(targetUrl) ? "website" : "other";
    }

    if (fileExtension === "pdf") {
        return "pdf";
    }

    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"].includes(fileExtension)) {
        return "image";
    }

    if (["mp4", "webm", "mov", "avi", "mkv", "ogv"].includes(fileExtension)) {
        return "video";
    }

    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(fileExtension)) {
        return "audio";
    }

    if (["ppt", "pptx", "odp", "key"].includes(fileExtension)) {
        return "presentation";
    }

    if (["xls", "xlsx", "ods", "csv", "tsv"].includes(fileExtension)) {
        return "spreadsheet";
    }

    if (["doc", "docx", "odt", "rtf", "txt", "md"].includes(fileExtension)) {
        return "document";
    }

    if (["html", "htm"].includes(fileExtension)) {
        return "website";
    }

    return "other";
}

function looksLikeWebsiteUrl(targetUrl: string): boolean {
    try {
        const parsedUrl = new URL(targetUrl, window.location.origin);
        return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
    } catch (error) {
        console.debug("Unable to classify cowebsite URL", error);
        return false;
    }
}
