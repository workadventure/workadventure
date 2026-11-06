import { AvailabilityStatus } from "@workadventure/messages";
import type { TranslationFunctions } from "../../../i18n/i18n-types";

export type AwayNotice = {
    text: string;
    /** The devices away mode holds off, which come back with the user. */
    detail: string | undefined;
};

/**
 * What a visitor reads on the tile of someone in away mode (in another window or tab), undefined otherwise. It says
 * nothing about what the user sees or hears: they may watch from another screen or the mini window, and their tab
 * plays the visitor's voice. A device the user turned off is never held, so it is never mentioned.
 */
export function awayNotice(
    LL: TranslationFunctions,
    status: AvailabilityStatus | undefined,
    name: string,
    cameraHeld: boolean,
    microphoneHeld: boolean,
): AwayNotice | undefined {
    if (status !== AvailabilityStatus.AWAY) return undefined;
    return {
        text: LL.video.remoteAway.inAnotherWindow({ name }),
        detail: cameraHeld
            ? microphoneHeld
                ? LL.video.remoteAway.cameraAndMicPaused()
                : LL.video.remoteAway.cameraPaused()
            : microphoneHeld
              ? LL.video.remoteAway.micPaused()
              : undefined,
    };
}
