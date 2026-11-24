import type { DesktopNotificationPayload } from "@workadventure/desktop-api";

/**
 * Returns a check that says whether a notification repeats one shown less than `windowMs` ago.
 *
 * Two tabs open on the same world each receive the same chat message and each ask for a
 * notification: the user must see it once. Only a notification with a `tag` (a chat room) can be a
 * duplicate; one without a tag is never dropped. Same tag, title and body within the window = the
 * same message.
 */
export function createNotificationDeduper(
    windowMs: number,
    now: () => number = Date.now
): (options: DesktopNotificationPayload) => boolean {
    const lastShown = new Map<string, number>();
    return (options) => {
        if (!options.tag) {
            return false;
        }
        const time = now();
        for (const [key, shownAt] of lastShown) {
            if (time - shownAt >= windowMs) {
                lastShown.delete(key);
            }
        }
        const key = JSON.stringify([options.tag, options.title, options.body]);
        if (lastShown.has(key)) {
            return true;
        }
        lastShown.set(key, time);
        return false;
    };
}
