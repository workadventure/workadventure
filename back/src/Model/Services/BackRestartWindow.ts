import { KEEP_CONVERSATIONS_ON_RESTART } from "../../Enum/EnvironmentVariable";

/**
 * How long after the back starts a space or a bubble it creates may be one it held before a restart, whose
 * conversation went on without it (LiveKit, P2P) while the fronts reconnected.
 */
const BACK_RESTART_WINDOW_MS = 120_000;

export function isWithinBackRestartWindow(): boolean {
    return KEEP_CONVERSATIONS_ON_RESTART && process.uptime() * 1000 <= BACK_RESTART_WINDOW_MS;
}
