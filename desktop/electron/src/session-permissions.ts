import type { Session } from "electron";
import { isAllowedNavigationUrl, type DesktopConfig } from "./desktop-url-policy";

const allowedPermissions = new Set([
    "media",
    "display-capture",
    "notifications",
    "fullscreen",
    "clipboard-sanitized-write",
]);

/**
 * Grant these to pages of a trusted server, without granting clipboard reads. Judged on the page the user
 * opened, not on the frame asking: like in a browser, an embedded site (a Jitsi room, a co-website) gets
 * the world's camera and microphone only if the world delegates them with `allow="camera; microphone"`,
 * which Chromium enforces whatever this answers. Judging the frame let only iframes on the hosted
 * service's own hosts have them.
 */
export function configureSessionPermissions(
    target: Pick<Session, "setPermissionRequestHandler">,
    config: () => DesktopConfig
): void {
    target.setPermissionRequestHandler((contents, permission, callback) => {
        callback(allowedPermissions.has(permission) && isAllowedNavigationUrl(contents.getURL(), config()));
    });
}
