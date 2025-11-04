import type { Readable, Unsubscriber } from "svelte/store";

/**
 * Creates a store wrapper that delays unsubscription by a specified amount of time.
 *
 * This utility is designed to prevent unnecessary store deinitialization and reinitialization
 * when the last unsubscription is quickly followed by a new subscription. This is particularly
 * useful for stores that have expensive initialization logic (e.g., acquiring media streams,
 * establishing network connections, loading heavy resources).
 *
 * ## How it works:
 *
 * 1. When a subscriber subscribes to the delayed store, it immediately subscribes to the
 *    underlying store and passes through all values.
 *
 * 2. When a subscriber unsubscribes, instead of immediately unsubscribing from the underlying
 *    store, a timer is started.
 *
 * 3. If a new subscription occurs before the timer expires, the timer is cancelled and the
 *    existing subscription to the underlying store is reused.
 *
 * 4. If the timer expires without any new subscriptions, the store finally unsubscribes from
 *    the underlying store.
 *
 * ## Use cases:
 *
 * - **Media streams**: Avoid repeatedly requesting camera/microphone permissions
 * - **WebRTC connections**: Prevent connection churn during rapid mount/unmount cycles
 * - **Network requests**: Avoid redundant API calls when components rapidly mount/unmount
 * - **Heavy computations**: Preserve computed state during navigation transitions
 *
 * ## Example:
 *
 * ```typescript
 * import { readable } from "svelte/store";
 * import { createDelayedUnsubscribeStore } from "./createDelayedUnsubscribeStore";
 *
 * // Create an expensive store (e.g., media stream acquisition)
 * const expensiveMediaStore = readable<MediaStream | null>(null, (set) => {
 *     console.log("Initializing media stream (expensive!)");
 *
 *     navigator.mediaDevices.getUserMedia({ video: true, audio: true })
 *         .then(stream => set(stream))
 *         .catch(err => console.error(err));
 *
 *     return () => {
 *         console.log("Cleaning up media stream");
 *         // Cleanup logic here
 *     };
 * });
 *
 * // Wrap it with delayed unsubscribe (2 second delay)
 * const delayedMediaStore = createDelayedUnsubscribeStore(expensiveMediaStore, 2000);
 *
 * // Now rapid subscribe/unsubscribe cycles won't trigger reinitialization
 * const unsubscribe1 = delayedMediaStore.subscribe(stream => console.log("Stream:", stream));
 * unsubscribe1(); // Starts 2 second timer
 *
 * // If we subscribe again within 2 seconds, no reinitialization occurs
 * const unsubscribe2 = delayedMediaStore.subscribe(stream => console.log("Stream:", stream));
 * ```
 *
 * @template T The type of value emitted by the store
 * @param store The underlying Readable store to wrap
 * @param delayForUnsubscribe The delay in milliseconds before actually unsubscribing from the underlying store
 * @returns A new Readable store with delayed unsubscription behavior
 *
 * @throws {Error} If delayForUnsubscribe is negative
 */
export function createDelayedUnsubscribeStore<T>(store: Readable<T>, delayForUnsubscribe: number): Readable<T> {
    if (delayForUnsubscribe < 0) {
        throw new Error("delayForUnsubscribe must be a non-negative number");
    }

    // Track the underlying store subscription
    let underlyingUnsubscribe: Unsubscriber | null = null;

    // Track the number of active subscribers
    let subscriberCount = 0;

    // Track the pending unsubscription timer
    let unsubscribeTimer: ReturnType<typeof setTimeout> | null = null;

    // Store the last known value from the underlying store
    let currentValue: T | undefined = undefined;
    let hasValue = false;

    // Track all active subscriber callbacks
    const subscribers = new Set<(value: T) => void>();

    /**
     * Actually unsubscribe from the underlying store
     */
    const performUnsubscribe = () => {
        if (underlyingUnsubscribe) {
            underlyingUnsubscribe();
            underlyingUnsubscribe = null;
            hasValue = false;
        }
    };

    /**
     * Cancel any pending unsubscription
     */
    const cancelPendingUnsubscribe = () => {
        if (unsubscribeTimer !== null) {
            clearTimeout(unsubscribeTimer);
            unsubscribeTimer = null;
        }
    };

    /**
     * Subscribe to the underlying store if not already subscribed
     */
    const ensureSubscribed = () => {
        if (!underlyingUnsubscribe) {
            underlyingUnsubscribe = store.subscribe((value: T) => {
                currentValue = value;
                hasValue = true;
                // Notify all subscribers
                subscribers.forEach((callback) => {
                    callback(value);
                });
            });
        }
    };

    return {
        subscribe: (run: (value: T) => void): Unsubscriber => {
            // Cancel any pending unsubscription
            cancelPendingUnsubscribe();

            // Ensure we're subscribed to the underlying store
            ensureSubscribed();

            // Add this subscriber to our set
            subscribers.add(run);
            subscriberCount++;

            // If we already have a value, immediately call the subscriber with it
            if (hasValue && currentValue !== undefined) {
                run(currentValue);
            }

            // Return unsubscriber function
            return () => {
                // Remove this subscriber
                subscribers.delete(run);
                subscriberCount--;

                // If this was the last subscriber, start the delayed unsubscribe timer
                if (subscriberCount === 0) {
                    unsubscribeTimer = setTimeout(() => {
                        performUnsubscribe();
                        unsubscribeTimer = null;
                    }, delayForUnsubscribe);
                }
            };
        },
    };
}
