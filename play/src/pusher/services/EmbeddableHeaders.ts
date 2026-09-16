/**
 * Decides from a site's response headers whether a browser will let us load it in an iframe.
 *
 * Browsers honour two mechanisms: the legacy `X-Frame-Options` header, and the
 * `frame-ancestors` directive of `Content-Security-Policy`, which most sites use today
 * (claude.ai, for one, sends only the latter). When both are present, CSP wins.
 */
export function isFrameable(headers: Record<string, unknown>, ownOrigin: string): boolean {
    const frameAncestors = header(headers, "content-security-policy")
        .split(";")
        .map((directive) => directive.trim().toLowerCase())
        .find((directive) => directive.startsWith("frame-ancestors"));

    if (frameAncestors !== undefined) {
        const sources = frameAncestors.split(/\s+/).slice(1);
        return sources.some((source) => source === "*" || source === "https:" || matchesOrigin(source, ownOrigin));
    }

    const xFrameOptions = header(headers, "x-frame-options").toLowerCase();
    return xFrameOptions !== "deny" && xFrameOptions !== "sameorigin";
}

function header(headers: Record<string, unknown>, name: string): string {
    const value = headers[name];
    return typeof value === "string" ? value : "";
}

// ponytail: exact host or "*.example.com" wildcard only, no scheme/port matching; extend if a site ever needs it.
function matchesOrigin(source: string, ownOrigin: string): boolean {
    let ownHost: string;
    try {
        ownHost = new URL(ownOrigin).hostname.toLowerCase();
    } catch {
        return false;
    }
    const sourceHost = source.replace(/^[a-z]+:\/\//, "");
    return sourceHost === ownHost || (sourceHost.startsWith("*.") && ownHost.endsWith(sourceHost.slice(1)));
}
