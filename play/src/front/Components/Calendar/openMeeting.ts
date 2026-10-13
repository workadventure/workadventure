import { get } from "svelte/store";
import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { gameManager } from "../../Phaser/Game/GameManager";
import { extensionModuleStore } from "../../Stores/GameSceneStore";

/**
 * Lets the calendar's extension module open an external meeting in its own popup.
 * Returns true when one did, so the caller cancels the link, which would otherwise open the meeting in a new tab.
 */
export function openMeeting(event: CalendarEventInterface): boolean {
    const joinUrl = event.resource?.onlineMeeting?.joinUrl;
    if (!joinUrl || !gameManager.getCurrentGameScene()) return false;

    let opened = false;
    for (const extensionModule of get(extensionModuleStore).values()) {
        // A module that has openPopupMeeting may still not handle this meeting (the Teams module, for a Google Meet
        // link or outside a Teams area): only its answer says whether the link must be cancelled.
        const handled = extensionModule?.openPopupMeeting?.(
            event.title,
            joinUrl,
            event.id,
            event.start,
            event.end,
            event.resource?.onlineMeeting?.passcode,
        );
        if (handled === true) opened = true;
    }
    return opened;
}
