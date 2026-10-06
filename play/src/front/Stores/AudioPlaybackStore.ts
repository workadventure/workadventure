import type { Readable, Unsubscriber } from "svelte/store";
import { get, writable } from "svelte/store";

export type AudioPlaybackRetry = () => void | Promise<void>;

export interface AudioPlaybackStore extends Readable<ReadonlySet<AudioPlaybackRetry>> {
    register: (retry: AudioPlaybackRetry) => Unsubscriber;
    retryAll: () => Promise<void>;
}

export function createAudioPlaybackStore(): AudioPlaybackStore {
    const retries = writable<ReadonlySet<AudioPlaybackRetry>>(new Set());

    return {
        subscribe: retries.subscribe,
        register(retry): Unsubscriber {
            retries.update((currentRetries) => new Set(currentRetries).add(retry));

            let isRegistered = true;
            return () => {
                console.trace("Audio source unregister called");
                if (!isRegistered) {
                    return;
                }
                isRegistered = false;
                retries.update((currentRetries) => {
                    const updatedRetries = new Set(currentRetries);
                    updatedRetries.delete(retry);
                    return updatedRetries;
                });
            };
        },
        async retryAll(): Promise<void> {
            const results = Array.from(get(retries), (retry) => {
                try {
                    return Promise.resolve(retry());
                } catch (error) {
                    return Promise.reject(
                        error instanceof Error ? error : new Error("Audio playback retry failed", { cause: error }),
                    );
                }
            });

            const settledResults = await Promise.allSettled(results);
            const errors = settledResults
                .filter((result): result is PromiseRejectedResult => result.status === "rejected")
                .map((result) => result.reason);
            if (errors.length > 0) {
                throw new AggregateError(errors, "Could not restart all blocked audio playback");
            }
        },
    };
}

export const audioPlaybackStore = createAudioPlaybackStore();

let blockedLatchUnregister: Unsubscriber | undefined;

/**
 * Signals that audio playback was blocked by the browser because the page has no user activation yet.
 *
 * This keeps the BrowserNoSoundInfoToast visible (and the user in BACK_IN_A_MOMENT status) until the next
 * user gesture, INDEPENDENTLY of any single <audio> element. Previously each AudioStream registered its own
 * retry and removed it on destroy — but registering flips the status to BACK_IN_A_MOMENT, which closes the
 * proximity bubble and destroys the AudioStream, which removed the registration again, so the toast flashed
 * and vanished. Owning a single app-lifetime latch here breaks that loop.
 *
 * The latch is a no-op retry: it exists only to keep the store non-empty. It is released when the user
 * interacts with the page (retryAll runs via the toast's gesture listeners); live AudioStreams then retry
 * their own playback separately. Calling this repeatedly is a no-op while the latch is already set.
 */
export function signalAudioPlaybackBlocked(): void {
    if (blockedLatchUnregister) {
        return;
    }
    blockedLatchUnregister = audioPlaybackStore.register(() => {
        blockedLatchUnregister?.();
        blockedLatchUnregister = undefined;
    });
}
