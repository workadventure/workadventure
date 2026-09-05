import { RemoteTrack } from "livekit-client";
import * as Sentry from "@sentry/svelte";

/**
 * [INTERNAL ACCESS WARNING]
 * This module disables livekit-client's per-track "time sync" monitor by overriding the
 * non-abstract `RemoteTrack.prototype.registerTimeSyncUpdate` method with a no-op.
 *
 * Why:
 * `registerTimeSyncUpdate()` starts a `requestAnimationFrame` loop (livekit-client
 * `src/room/track/RemoteTrack.ts`) that calls the native `RTCRtpReceiver.getSynchronizationSources()`
 * once per frame, per subscribed remote track (audio AND video). Its only output is the
 * `TrackEvent.TimeSyncUpdate` event, which livekit consumes solely for the video "packet trailer"
 * feature. WorkAdventure never subscribes to `TimeSyncUpdate` anywhere, so for us this loop is pure
 * wasted main-thread work. In a large meeting (~50 subscribed tracks) it runs ~50×/frame and was
 * measured at ~8% of the main thread in a staging performance trace, causing choppy Woka movement.
 *
 * Safety:
 * - We only neutralize the rAF time-sync loop. The separate 2s stats interval (`monitorReceiver`,
 *   used for bitrate/quality analytics) is on `startMonitor()` and is left untouched.
 * - Active-speaker / isSpeaking state is server-pushed and does not depend on this loop.
 *
 * Fragility:
 * This reaches into a livekit-client internal method and may break on upgrade. If the method ever
 * disappears (rename/removal), the guard below reports it so the patch does not silently stop
 * applying. Re-verify against livekit-client on every upgrade. Current target: livekit-client 2.19.x.
 */
function patchLivekitTimeSync(): void {
    const proto = RemoteTrack.prototype as { registerTimeSyncUpdate?: () => void };

    if (typeof proto.registerTimeSyncUpdate !== "function") {
        // The internal method we intended to disable no longer exists. The per-frame monitor may be
        // back (and hurting performance) under a different name. Surface it loudly rather than fail silently.
        const message =
            "patchLivekitTimeSync: RemoteTrack.prototype.registerTimeSyncUpdate is not a function. " +
            "livekit-client internals changed; the time-sync monitor patch no longer applies and must be revisited.";
        console.error(message);
        Sentry.captureMessage(message, { level: "warning" });
        return;
    }

    // Replace with a no-op: never start the per-frame getSynchronizationSources() loop.
    proto.registerTimeSyncUpdate = function registerTimeSyncUpdate(): void {
        // Intentionally does nothing. See file header for rationale.
    };
}

patchLivekitTimeSync();
