import { powerMonitor } from "electron";
import ElectronLog from "electron-log";
import { setIdle } from "./presence";

/**
 * Detect when the user steps away and forward that as an "idle" signal, used to:
 *   - flip the tray status dot to amber (via presence.setIdle);
 *   - let the renderer auto-set the WA availability to "away" (which, via the existing
 *     allowNotificationSound() gate, also suppresses OS notifications) and restore it on return.
 *
 * WHAT COUNTS AS AWAY: no input for `IDLE_THRESHOLD_SECONDS` (powerMonitor.getSystemIdleState),
 * the screen being locked, or the machine suspending. Returning (unlock / resume / input) clears
 * it, and the poll re-confirms.
 *
 * ON macOS DO-NOT-DISTURB / FOCUS: there is no reliable cross-version API. The system Focus status
 * (NSFocusStatus / INFocusStatusCenter) requires the com.apple.developer.usernotifications
 * .communication entitlement AND explicit per-user permission, and reading the private
 * ~/Library/DoNotDisturb/DB plists is fragile — their location and schema changed across
 * Monterey → Ventura → Sonoma and they are increasingly sandbox-restricted. Rather than ship a
 * flaky heuristic, we approximate "don't disturb me" with the robust idle + screen-lock signal
 * above, which captures the same intent (you're away → hush). True Focus detection can be added
 * later via a signed native module if it proves worth the entitlement.
 */

const DEFAULT_IDLE_THRESHOLD_SECONDS = 300;
const MIN_IDLE_THRESHOLD_SECONDS = 60;
const POLL_INTERVAL_MS = 15_000;

function resolveIdleThresholdSeconds(): number {
    const raw = Number(process.env.WA_DESKTOP_IDLE_SECONDS);
    if (!Number.isFinite(raw) || raw <= 0) {
        return DEFAULT_IDLE_THRESHOLD_SECONDS;
    }
    return Math.max(MIN_IDLE_THRESHOLD_SECONDS, Math.floor(raw));
}

let pollTimer: ReturnType<typeof setInterval> | undefined;
let currentIdle = false;
let onIdleChange: ((idle: boolean) => void) | undefined;

function applyIdle(idle: boolean): void {
    if (idle === currentIdle) {
        return;
    }
    currentIdle = idle;
    setIdle(idle);
    onIdleChange?.(idle);
}

function pollIdleState(thresholdSeconds: number): void {
    try {
        // "active" | "idle" | "locked" | "unknown". Treat locked as away; leave "unknown" as-is
        // (some Linux setups can't report it — don't thrash the status on a missing signal).
        const state = powerMonitor.getSystemIdleState(thresholdSeconds);
        if (state === "idle" || state === "locked") {
            applyIdle(true);
        } else if (state === "active") {
            applyIdle(false);
        }
    } catch (error) {
        ElectronLog.debug("powerMonitor.getSystemIdleState failed", error);
    }
}

/**
 * Start watching for idle/away transitions. `onChange(idle)` is called on every transition so the
 * caller can forward it to the renderer. Safe to call once after app.whenReady().
 */
export function startIdleMonitor(onChange: (idle: boolean) => void): void {
    if (pollTimer) {
        return;
    }
    onIdleChange = onChange;
    const thresholdSeconds = resolveIdleThresholdSeconds();

    // Immediate + interval polling for the no-input case (powerMonitor exposes no "went idle" event).
    pollIdleState(thresholdSeconds);
    pollTimer = setInterval(() => pollIdleState(thresholdSeconds), POLL_INTERVAL_MS);
    if (typeof pollTimer.unref === "function") {
        pollTimer.unref();
    }

    // Discrete events give an instant transition without waiting for the next poll.
    powerMonitor.on("lock-screen", () => applyIdle(true));
    powerMonitor.on("suspend", () => applyIdle(true));
    powerMonitor.on("unlock-screen", () => applyIdle(false));
    powerMonitor.on("resume", () => applyIdle(false));
}

export function stopIdleMonitor(): void {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = undefined;
    }
    onIdleChange = undefined;
    currentIdle = false;
}
