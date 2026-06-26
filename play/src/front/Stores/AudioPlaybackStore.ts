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
                console.warn("AUDIO UNREGISTERING");
                if (!isRegistered) {
                    return;
                }
                console.warn("AUDIO UNREGISTERED");
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
