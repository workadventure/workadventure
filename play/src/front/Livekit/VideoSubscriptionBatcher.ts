import type { RemoteTrackPublication } from "livekit-client";
import * as Sentry from "@sentry/svelte";

/**
 * Video subscribe/unsubscribe changes are coalesced into short batches before being applied to
 * livekit-client.
 *
 * Why: each `RemoteTrackPublication.setSubscribed()` immediately sends an `UpdateSubscription` signal
 * to the SFU, which answers with a `mediaSectionsRequirement` that forces a publisher-side
 * renegotiation. livekit-client debounces its publisher `negotiate()` by only ~20 ms, so subscription
 * changes that dribble out across animation frames (joining a meeting where many tiles mount, or a Woka
 * moving past a crowd) each produce their own renegotiation. Applying all pending changes in a single
 * synchronous flush makes the server's media-section updates cluster inside that 20 ms window, so a
 * burst collapses into a single renegotiation instead of one per frame.
 *
 * It also cancels out transient churn: a tile that becomes visible and then hidden again within the
 * batch window resolves to "no change" and never hits the network at all.
 *
 * Only camera/screen-share VIDEO subscriptions go through here — audio is subscribed once and never
 * toggled, so it does not churn.
 */
export const VIDEO_SUBSCRIPTION_BATCH_MS = 50;

export class VideoSubscriptionBatcher {
    /** Desired subscription state per publication, pending the next flush. */
    private readonly desired = new Map<RemoteTrackPublication, boolean>();
    /** Last state actually applied to livekit-client, to skip redundant `setSubscribed()` calls. */
    private readonly applied = new WeakMap<RemoteTrackPublication, boolean>();
    private timeout: ReturnType<typeof setTimeout> | undefined;

    constructor(private readonly batchDelayMs: number = VIDEO_SUBSCRIPTION_BATCH_MS) {}

    /**
     * Requests a subscription change for a video publication. The change is applied on the next batch
     * flush; intermediate changes for the same publication within the window are coalesced to the last
     * requested value.
     */
    request(publication: RemoteTrackPublication, subscribed: boolean): void {
        this.desired.set(publication, subscribed);
        if (this.timeout === undefined) {
            this.timeout = setTimeout(() => this.flush(), this.batchDelayMs);
        }
    }

    /**
     * Applies all pending subscription changes to livekit-client in one synchronous pass, so their
     * renegotiations collapse. Only net changes (desired !== last applied) reach the network.
     */
    flush(): void {
        if (this.timeout !== undefined) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }

        for (const [publication, subscribed] of this.desired) {
            if ((this.applied.get(publication) ?? false) === subscribed) {
                // Never subscribed and now unsubscribing, or already in the requested state: no-op.
                continue;
            }
            this.applied.set(publication, subscribed);
            try {
                publication.setSubscribed(subscribed);
            } catch (e) {
                // A single failing publication must not block the rest of the batch.
                console.error("VideoSubscriptionBatcher: setSubscribed failed", e);
                Sentry.captureException(e);
            }
        }

        this.desired.clear();
    }
}

/**
 * Shared batcher used by every {@link LiveKitParticipant}, so video subscription changes across all
 * participants flush together and collapse into a single renegotiation.
 */
export const videoSubscriptionBatcher = new VideoSubscriptionBatcher();
