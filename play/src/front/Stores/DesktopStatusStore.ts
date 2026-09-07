import { writable } from "svelte/store";

/**
 * True while the Electron desktop shell reports the user as idle/away (no input for a while, or
 * the screen is locked). Dedicated flag rather than piggy-backing on the availability status
 * machine: the derived availabilityStatusStore already flips a backgrounded window to AWAY via
 * privacyShutdown, and AWAY→BACK_IN_A_MOMENT is a rejected transition, so a status-only approach
 * would silently fail to hush notifications in the common "backgrounded + idle" case. This flag is
 * checked directly by NotificationManager.hasNotification() and is independent of that machine.
 */
export const desktopAwayStore = writable(false);
