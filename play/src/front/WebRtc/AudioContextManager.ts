/**
 * Singleton manager for AudioContext instances.
 * This manager ensures that we create only one AudioContext per sample rate,
 * and only when needed (lazy initialization).
 * This is important because:
 * 1. Creating multiple AudioContexts can be resource-intensive
 * 2. Some browsers require a user gesture to start an AudioContext
 */
class AudioContextManager {
    private audioContexts: Map<number, AudioContext> = new Map();
    private isShuttingDown = false;

    /**
     * Get or create an AudioContext with the specified sample rate.
     * The AudioContext is created lazily when first requested.
     * @param sampleRate The desired sample rate (default: browser's default)
     * @returns An AudioContext instance
     */
    public getContext(sampleRate?: number): AudioContext {
        if (this.isShuttingDown) {
            throw new Error("AudioContextManager is shutting down, cannot create new contexts");
        }

        // Use 0 as key for default sample rate (no options)
        const key = sampleRate ?? 0;

        let context = this.audioContexts.get(key);
        if (!context) {
            // Create new AudioContext with specified sample rate
            const options = sampleRate ? { sampleRate } : undefined;
            context = new AudioContext(options);
            this.audioContexts.set(key, context);
            console.debug(
                `[AudioContextManager] Created new AudioContext with ${
                    sampleRate ? `sample rate ${sampleRate}` : "default sample rate"
                }`
            );
        }

        return context;
    }

    /**
     * Close and remove an AudioContext with the specified sample rate.
     * This should be called when the context is no longer needed.
     * @param sampleRate The sample rate of the context to close (default: browser's default)
     */
    public async closeContext(sampleRate?: number): Promise<void> {
        const key = sampleRate ?? 0;
        const context = this.audioContexts.get(key);

        if (context && context.state !== "closed") {
            // Remove from map before closing to prevent concurrent access
            this.audioContexts.delete(key);
            try {
                await context.close();
                console.debug(`[AudioContextManager] Closed AudioContext with key ${key}`);
            } catch (err) {
                console.error(`[AudioContextManager] Error closing AudioContext with key ${key}:`, err);
                // Re-add to map if close failed
                this.audioContexts.set(key, context);
            }
        }
    }

    /**
     * Close all AudioContexts.
     * This should be called on cleanup/shutdown.
     */
    public async closeAllContexts(): Promise<void> {
        this.isShuttingDown = true;
        const closePromises: Promise<void>[] = [];

        this.audioContexts.forEach((context, key) => {
            if (context.state !== "closed") {
                closePromises.push(
                    context.close().catch((err) => {
                        console.error(`[AudioContextManager] Error closing AudioContext with key ${key}:`, err);
                    })
                );
            }
        });

        await Promise.all(closePromises);
        // Clear the map after all contexts are closed
        this.audioContexts.clear();
        console.debug("[AudioContextManager] All AudioContexts closed");
    }

    /**
     * Get the number of active AudioContexts.
     * Useful for debugging and monitoring.
     */
    public getActiveContextCount(): number {
        return this.audioContexts.size;
    }
}

// Export singleton instance
export const audioContextManager = new AudioContextManager();
