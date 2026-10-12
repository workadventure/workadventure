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
        if (!extensionModule?.openPopupMeeting) continue;
        extensionModule.openPopupMeeting(
            event.title,
            joinUrl,
            event.id,
            event.start,
            event.end,
            event.resource?.onlineMeeting?.passcode,
        );
        opened = true;
    }
    return opened;
}
