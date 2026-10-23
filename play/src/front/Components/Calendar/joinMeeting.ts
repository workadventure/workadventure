import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { scriptUtils } from "../../Api/ScriptUtils";
import { isCalendarVisibleStore } from "../../Stores/CalendarStore";
import { gameManager } from "../../Phaser/Game/GameManager";

/**
 * A meeting in this WorkAdventure: walk to its area, or travel to its map, without reloading the page.
 * False when the link leads to another WorkAdventure (or one the module could not resolve): follow it.
 */
export function goToWorkAdventureMeeting(url: URL): boolean {
    if (url.origin !== window.location.origin) return false;
    const scene = gameManager.getCurrentGameScene();
    if (url.pathname === window.location.pathname) {
        const target = new URLSearchParams(url.hash.slice(1)).get("moveTo");
        if (target) scene.walkToMoveTarget(target);
        // Already in the meeting's map, which has no area to walk to: just get the agenda out of the way.
        else isCalendarVisibleStore.set(false);
    } else {
        scene.onMapExit(url).catch((e) => console.error(e));
    }
    return true;
}

/** Join the event's meeting the way the agenda's Join button does. */
export function joinMeeting(event: CalendarEventInterface): void {
    const meeting = event.resource?.onlineMeeting;
    if (!meeting?.joinUrl) return;
    if (!meeting.isWorkAdventure) {
        // The way a website set to open in a new tab opens (map areas, chat links, WA.nav.openTab).
        scriptUtils.openTab(meeting.joinUrl);
        return;
    }
    const url = new URL(meeting.joinUrl);
    if (!goToWorkAdventureMeeting(url)) window.location.assign(url);
}
