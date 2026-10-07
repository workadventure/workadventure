type LoadPresence = { inWorld: boolean; onboarding: boolean };

/**
 * What the reach-the-world watchdog does when the presence changes. Its clock only runs while the
 * world is loading: it stops for good once the user is in, and pauses on the first-connection
 * screens (name, Woka, companion, camera), which wait for the user rather than the network. Leaving
 * those screens starts the clock again.
 */
export function reachWorldWatchdogStep(
    presence: LoadPresence,
    clockRunning: boolean
): "reached" | "pause" | "resume" | "none" {
    if (presence.inWorld) {
        return "reached";
    }
    if (presence.onboarding) {
        return clockRunning ? "pause" : "none";
    }
    return clockRunning ? "none" : "resume";
}

/**
 * What the watchdog does when its clock runs out. A world whose front has not reported its presence
 * since the load started cannot tell whether the user got in: a WorkAdventure server older than the
 * desktop app never does. It is left alone rather than sent back to the Landing every 45 seconds.
 */
export function reachWorldDeadlineAction(
    presence: LoadPresence,
    frontReportsPresence: boolean
): "reached" | "wait" | "unknown" | "bounce" {
    if (presence.inWorld) {
        return "reached";
    }
    if (presence.onboarding) {
        return "wait";
    }
    if (!frontReportsPresence) {
        return "unknown";
    }
    return "bounce";
}
