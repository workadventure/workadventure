/** The arrival screens, in the order GameManager can show them. */
export type OnboardingScreen = "name" | "woka" | "companion" | "camera";

/** Where GameManager.init() sends the player first: a screen, the PWA install prompt, or the room. */
export type OnboardingStart = OnboardingScreen | "pwa_install" | "room";

/** How a name or a Woka got settled without asking: already known, or chosen by the world. */
export type SettledBy = "known" | "imposed" | "random";

/**
 * How the name or the Woka got settled before any screen: known when the page loaded,
 * set by the world's default (`provideDefaultWokaName` / `provideDefaultWokaTexture`),
 * or not at all.
 */
export function settledBy(wasKnown: boolean, isSet: boolean, worldDefault: string): SettledBy | undefined {
    if (wasKnown) {
        return "known";
    }
    if (!isSet) {
        return undefined;
    }
    return worldDefault === "random" ? "random" : "imposed";
}

export interface OnboardingSkipReasons {
    nameSkipReason?: `name_${SettledBy}`;
    wokaSkipReason?: `woka_${SettledBy}` | "pwa_install";
    cameraSkipReason?: "camera_skipped_by_world" | "camera_already_configured" | "pwa_install";
}

/**
 * Why each arrival screen is skipped on this visit, for `onboarding.started`.
 *
 * Read off where init() sends the player, plus the two rules goToNextScene() applies
 * after that: the Woka screen follows the name screen only when there is no Woka yet,
 * and the camera screen follows any screen unless the world skips it. A shown screen
 * has no reason; `onboarding.screen_shown` is the record of those.
 *
 * `woka` is undefined when this browser has no Woka: an account's Woka lives on the
 * server, so a player init() does not send to the Woka screen has one there.
 */
export function onboardingSkipReasons(
    start: OnboardingStart,
    settled: { name: SettledBy | undefined; woka: SettledBy | undefined },
    cameraPageSkipped: boolean,
): OnboardingSkipReasons {
    const reasons: OnboardingSkipReasons = {};

    if (start !== "name") {
        reasons.nameSkipReason = `name_${settled.name ?? "known"}`;
    }

    if (start !== "woka" && !(start === "name" && settled.woka === undefined)) {
        reasons.wokaSkipReason =
            settled.woka === undefined && start === "pwa_install" ? "pwa_install" : `woka_${settled.woka ?? "known"}`;
    }

    if (cameraPageSkipped) {
        reasons.cameraSkipReason = "camera_skipped_by_world";
    } else if (start === "pwa_install") {
        // The install prompt leads straight into the room.
        reasons.cameraSkipReason = "pwa_install";
    } else if (start === "room") {
        // init() goes straight to the room only once the camera and microphone were chosen before.
        reasons.cameraSkipReason = "camera_already_configured";
    }

    return reasons;
}
