import * as Sentry from "@sentry/svelte";
import type { Unsubscriber } from "svelte/store";
import { bindAudioOutput } from "./AudioOutputManager";

export const RENDER_RECOVERY_INTERVAL_MS = 1_000;
export const RENDER_RECOVERY_MAX_ATTEMPTS = 30;

/**
 * Restarts a context after a render error (Chrome's "The AudioContext encountered an error from the audio device or
 * the WebAudio renderer": the system audio output failed), until the returned function is called.
 *
 * Chrome stops rendering and leaves the context suspended. A single resume() at that moment is not enough: the output
 * may still be unavailable, and nothing retries once it is back. Until the context renders again, every analyser on it
 * reads zeros: the volume meters stay flat and the "no microphone sound" warning shows for nothing.
 *
 * "Renders again" is checked on the clock (currentTime moves), not on the state alone.
 */
export function recoverFromRenderErrors(context: AudioContext): Unsubscriber {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const breadcrumb = (message: string, level: "info" | "warning" = "info") =>
        Sentry.addBreadcrumb({
            category: "audio-context",
            level,
            message,
            data: { state: context.state, sampleRate: context.sampleRate, sinkId: context.sinkId },
        });

    const schedule = (attemptsLeft: number) => {
        // Read now, compared after the delay: the clock only moves while the context renders
        const time = context.currentTime;
        timer = setTimeout(() => check(attemptsLeft, time), RENDER_RECOVERY_INTERVAL_MS);
    };

    const check = (attemptsLeft: number, previousTime: number) => {
        timer = undefined;
        if (context.state === "closed") {
            return;
        }
        if (context.state === "running" && context.currentTime > previousTime) {
            breadcrumb("AudioContext renders again after a render error");
            return;
        }
        if (attemptsLeft === 0) {
            breadcrumb("AudioContext did not recover from a render error", "warning");
            console.warn("[AudioContextManager] AudioContext did not recover from a render error");
            return;
        }
        // "running" with a frozen clock: resume() would do nothing, only a suspend/resume cycle restarts the output
        const restart = context.state === "running" ? context.suspend().then(() => context.resume()) : context.resume();
        restart.catch((e: unknown) => console.debug("[AudioContextManager] Could not restart the AudioContext", e));
        schedule(attemptsLeft - 1);
    };

    const onError = () => {
        breadcrumb("AudioContext render error", "warning");
        // One recovery at a time: Chrome reports the same failure several times in a row
        if (timer === undefined) {
            schedule(RENDER_RECOVERY_MAX_ATTEMPTS);
        }
    };

    context.addEventListener("error", onError);
    return () => {
        context.removeEventListener("error", onError);
        clearTimeout(timer);
    };
}

export interface AudioContextProbe {
    readonly isPlaybackAvailable: boolean;
    resume: () => Promise<void>;
    dispose: () => void;
}
/**
 * Resumes a context on the first user gesture when the browser created it suspended (no user activation yet), until
 * the returned function is called.
 */
function resumeOnUserGesture(context: AudioContext): Unsubscriber {
    const controller = new AbortController();
    const resume = () => {
        context
            .resume()
            .then(() => controller.abort())
            .catch((e: unknown) => console.debug("[AudioContextManager] Could not resume the AudioContext", e));
    };
    // Without a user activation, this promise stays pending until a later call succeeds
    resume();
    for (const type of ["pointerdown", "keydown"] as const) {
        // Unregistered through the signal
        document.addEventListener(type, resume, { signal: controller.signal, capture: true });
    }
    return () => controller.abort();
}

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
    private analysisContexts: Map<number, AudioContext> = new Map();
    // What plays through a context (the WebAudio playback fallback, the scripting API's PCM streams) bypasses media
    // elements, so each context follows the selected audio output itself, until it is closed. Analysis contexts only
    // keep here what resumes them.
    private outputBindings: Map<AudioContext, Unsubscriber> = new Map();
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
            const unbindOutput = bindAudioOutput(context);
            const stopRecovery = recoverFromRenderErrors(context);
            this.outputBindings.set(context, () => {
                unbindOutput();
                stopRecovery();
            });
            console.debug(
                `[AudioContextManager] Created new AudioContext with ${
                    sampleRate ? `sample rate ${sampleRate}` : "default sample rate"
                }`,
            );
        }

        return context;
    }

    /**
     * Get or create an AudioContext that only analyses audio and never plays any: volume meters, microphone signal
     * and background noise detection.
     *
     * It has no audio output where the browser allows it (Chrome 110+; elsewhere it is an ordinary context, which no
     * one binds to an output). The contexts of getContext() follow the selected speaker: when that device goes away,
     * Chrome stops them, and every analyser on them reads zeros. What listens to the microphone must not depend on a
     * speaker.
     * @param sampleRate The desired sample rate (default: browser's default)
     */
    public getAnalysisContext(sampleRate?: number): AudioContext {
        if (this.isShuttingDown) {
            throw new Error("AudioContextManager is shutting down, cannot create new contexts");
        }

        const key = sampleRate ?? 0;
        let context = this.analysisContexts.get(key);
        if (!context) {
            const options: AudioContextOptions = sampleRate ? { sampleRate } : {};
            try {
                context = new AudioContext({ ...options, sinkId: { type: "none" } });
            } catch (e) {
                console.warn("[AudioContextManager] Could not create an AudioContext without an output", e);
                context = new AudioContext(options);
            }
            this.analysisContexts.set(key, context);
            // Nothing else resumes it: the "sound blocked" flow of the GameScene only watches the playback context
            this.outputBindings.set(context, resumeOnUserGesture(context));
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
                this.unbindOutput(context);
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

        [...this.audioContexts, ...this.analysisContexts].forEach(([key, context]) => {
            if (context.state !== "closed") {
                closePromises.push(
                    context.close().catch((err) => {
                        console.error(`[AudioContextManager] Error closing AudioContext with key ${key}:`, err);
                    }),
                );
            }
        });

        await Promise.all(closePromises);
        // Clear the maps after all contexts are closed
        this.audioContexts.clear();
        this.analysisContexts.clear();
        this.outputBindings.forEach((unbind) => unbind());
        this.outputBindings.clear();
        console.debug("[AudioContextManager] All AudioContexts closed");
    }

    private unbindOutput(context: AudioContext): void {
        this.outputBindings.get(context)?.();
        this.outputBindings.delete(context);
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
