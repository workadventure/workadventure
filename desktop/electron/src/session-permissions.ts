import type { Session } from "electron";
import { isAllowedNavigationUrl, type DesktopConfig } from "./desktop-url-policy";

const allowedPermissions = new Set([
    "media",
    "display-capture",
    "notifications",
    "fullscreen",
    "clipboard-sanitized-write",
]);

/** Permit the browser clipboard write API on trusted WA origins, without granting clipboard reads. */
export function configureSessionPermissions(
    target: Pick<Session, "setPermissionRequestHandler">,
    config: () => DesktopConfig
): void {
    target.setPermissionRequestHandler((contents, permission, callback, details) => {
        const requestingUrl = details.requestingUrl || contents.getURL();
        callback(allowedPermissions.has(permission) && isAllowedNavigationUrl(requestingUrl, config()));
    });
}
