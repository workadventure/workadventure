/**
 * Validates and normalizes the desktop app's loopback callback URL (the `desktopCallbackUrl` query
 * param the Electron app appends to /login-screen and /logout when `desktop=true`).
 *
 * The desktop app runs a loopback HTTP server on 127.0.0.1 and asks the pusher to redirect the auth
 * window back to `http://127.0.0.1:<port>/<kind>/callback/<secret>?state=<state>` once OIDC finishes.
 * The `<secret>` path segment plus `state` are the desktop's own CSRF check (constant-time compared
 * on the desktop side). We only accept the loopback callback shapes here so this can never become an
 * open redirect; the secret itself is not verified here, only its shape.
 *
 * Returns the URL unchanged (preserving the secret path and `state` query) when it matches, or
 * `undefined` for anything else so callers fall back to the `workadventure://` deep link.
 */
export function normalizeDesktopCallbackUrl(value: string | undefined): string | undefined {
    if (!value) {
        return undefined;
    }

    try {
        const url = new URL(value);
        if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
            return undefined;
        }
        // `/auth/callback` or `/logout/callback`, optionally followed by the desktop's CSRF secret
        // segment (a hex token from `crypto.randomBytes(...).toString("hex")`, 32 bytes → 64 chars).
        const segments = url.pathname.split("/").filter(Boolean);
        const validShape =
            (segments[0] === "auth" || segments[0] === "logout") &&
            segments[1] === "callback" &&
            (segments.length === 2 || (segments.length === 3 && /^[a-f0-9]{16,128}$/.test(segments[2])));
        if (!validShape) {
            return undefined;
        }

        return url.toString();
    } catch {
        return undefined;
    }
}
