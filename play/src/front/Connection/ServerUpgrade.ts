import { KEEP_CONVERSATIONS_ON_RESTART } from "../Enum/EnvironmentVariable";
import type { RoomConnection } from "./RoomConnection";

// A deploy announces itself ("workadventure:reboot"), waits for its pods for up to 20 minutes, then announces the
// end ("workadventure:rebooted"). Past that, a lost connection is no longer read as that deploy.
const UPGRADE_ANNOUNCEMENT_TTL_MS = 20 * 60_000;

// Module-level: the announcement must outlive the connection it came through, which the upgrade itself closes.
let upgradeAnnouncedAt: number | undefined;

/**
 * Whether a lost connection to the server is an upgrade the server announced, while the conversations are kept across
 * a server restart (KEEP_CONVERSATIONS_ON_RESTART): the user is then told the conversations go on, not that the
 * connection is lost.
 */
export function isServerUpgrading(now = Date.now()): boolean {
    return (
        KEEP_CONVERSATIONS_ON_RESTART &&
        upgradeAnnouncedAt !== undefined &&
        now - upgradeAnnouncedAt < UPGRADE_ANNOUNCEMENT_TTL_MS
    );
}

/** Listens to the upgrade announcements a deploy sends to every room (global events, see AdminController). */
export function listenToServerUpgradeAnnouncements(
    connection: Pick<RoomConnection, "receivedEventMessageStream">,
): void {
    // The receivedEventMessageStream is completed with the RoomConnection.
    //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
    connection.receivedEventMessageStream.subscribe((event) => {
        if (event.name === "workadventure:reboot") {
            upgradeAnnouncedAt = Date.now();
        } else if (event.name === "workadventure:rebooted") {
            upgradeAnnouncedAt = undefined;
        }
    });
}
