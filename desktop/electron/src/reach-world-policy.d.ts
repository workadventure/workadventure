export function reachWorldWatchdogStep(
    presence: { inWorld: boolean; onboarding: boolean },
    clockRunning: boolean
): "reached" | "pause" | "resume" | "none";

export function reachWorldDeadlineAction(
    presence: { inWorld: boolean; onboarding: boolean },
    frontReportsPresence: boolean
): "reached" | "wait" | "unknown" | "bounce";
