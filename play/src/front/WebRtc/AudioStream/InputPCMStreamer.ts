import { Subject } from "rxjs";
import { customWebRTCLogger } from "../CustomWebRTCLogger";
import audioWorkletProcessorUrl from "./InputAudioWorkletProcessor.ts?worker&url";

export class InputPCMStreamer {
    private readonly audioContext: AudioContext;
    private workletNode: AudioWorkletNode | null = null;
    private isWorkletLoaded = false;
    private readonly _pcmDataStream: Subject<Float32Array> = new Subject();
    public readonly pcmDataStream = this._pcmDataStream.asObservable();
    private audioContextStateChangeHandler: (() => void) | null = null;
    private keepAliveNode: GainNode | null = null;

    constructor(sampleRate = 24000) {
        //this.audioContext = new AudioContext({ sampleRate });
        this.audioContext = new AudioContext();
        this.setupAudioContextErrorHandling();
    }

    private setupAudioContextErrorHandling(): void {
        // Handle AudioContext state changes and auto-resume when suspended
        this.audioContextStateChangeHandler = () => {
            if (this.audioContext.state === "suspended") {
                console.warn("[InputPCMStreamer] AudioContext suspended, attempting to resume");
                // Automatically resume when suspended
                this.audioContext.resume().catch((e) => {
                    console.error("[InputPCMStreamer] Failed to auto-resume AudioContext:", e);
                });
            } else if (this.audioContext.state === "running") {
                console.log("[InputPCMStreamer] AudioContext running");
            } else if (this.audioContext.state === "closed") {
                console.warn("[InputPCMStreamer] AudioContext closed");
            }
        };
        this.audioContext.addEventListener("statechange", this.audioContextStateChangeHandler);

        // Listen for AudioContext errors (browser-level errors from audio device or WebAudio renderer)
        // Note: This is a non-standard event but some browsers may emit it
        // We also handle errors in createMediaStreamSource catch block
        if (typeof (this.audioContext as unknown as { onerror?: (event: Event) => void }).onerror !== "undefined") {
            (this.audioContext as unknown as { onerror: (event: Event) => void }).onerror = (event: Event) => {
                console.error("[InputPCMStreamer] AudioContext error event:", event);
                // When AudioContext encounters an error, disconnect all source nodes to prevent further errors
                // This helps recover from device errors or WebAudio renderer issues
                for (const [stream, entry] of this.mediaStreams.entries()) {
                    if (entry.sourceNode) {
                        try {
                            this.disconnectAndDisposeSource(stream);
                            console.log(
                                "[InputPCMStreamer] Disconnected source node due to AudioContext error:",
                                stream.id
                            );
                        } catch (e) {
                            console.error("[InputPCMStreamer] Error disconnecting source node:", e);
                        }
                    }
                }
            };
        }
    }

    private setupKeepAlive(): void {
        // Create a silent gain node connected to destination to keep AudioContext active
        // This prevents the browser from suspending the AudioContext
        // Only create if not already created
        if (this.keepAliveNode) {
            return;
        }
        try {
            this.keepAliveNode = this.audioContext.createGain();
            this.keepAliveNode.gain.value = 0; // Silent
            this.keepAliveNode.connect(this.audioContext.destination);
            console.log("[InputPCMStreamer] Keep-alive node created to maintain AudioContext active");
        } catch (e) {
            console.warn("[InputPCMStreamer] Failed to create keep-alive node:", e);
        }
    }

    // Initialize the AudioWorklet and load the processor script
    public async initWorklet() {
        if (!this.isWorkletLoaded) {
            try {
                await this.audioContext.resume();
                // Setup keep-alive after AudioContext is resumed to maintain it active
                this.setupKeepAlive();
                await this.audioContext.audioWorklet.addModule(audioWorkletProcessorUrl);
                this.workletNode = new AudioWorkletNode(this.audioContext, "input-pcm-worklet-processor");
                this.isWorkletLoaded = true;

                this.workletNode.port.onmessage = (event: MessageEvent) => {
                    const data = event.data.pcmData;
                    if (data instanceof Float32Array) {
                        this._pcmDataStream.next(data);
                    } else {
                        console.error("Invalid data type received in worklet", event.data);
                    }
                };
            } catch (err) {
                console.error("Failed to load AudioWorkletProcessor:", err);
            }
        }
    }

    private mediaStreams: Map<
        MediaStream,
        {
            sourceNode: MediaStreamAudioSourceNode | null;
            onAddTrack: (ev: MediaStreamTrackEvent) => void;
            onRemoveTrack: (ev: MediaStreamTrackEvent) => void;
            trackEndedHandlers: Map<MediaStreamTrack, () => void>;
        }
    > = new Map();

    private hasLiveAudioTrack(stream: MediaStream): boolean {
        // Consider a track usable if it is an audio track and not ended
        return stream.getAudioTracks().some((t) => t.readyState === "live");
    }

    private async ensureSourceConnected(stream: MediaStream): Promise<void> {
        // Re-check entry after async operations to handle race conditions
        let entry = this.mediaStreams.get(stream);
        if (!entry || !this.isWorkletLoaded || !this.workletNode) {
            console.log("[InputPCMStreamer] Cannot connect source - missing prerequisites", {
                hasEntry: !!entry,
                isWorkletLoaded: this.isWorkletLoaded,
                hasWorkletNode: !!this.workletNode,
                streamId: stream.id,
            });
            return;
        }
        if (entry.sourceNode) {
            console.log("[InputPCMStreamer] Source already connected for stream:", stream.id);
            return; // already connected
        }
        if (!this.hasLiveAudioTrack(stream)) {
            console.log("[InputPCMStreamer] No live audio tracks yet for stream:", stream.id, {
                audioTracks: stream.getAudioTracks().length,
                trackStates: stream.getAudioTracks().map((t) => ({ id: t.id, readyState: t.readyState })),
            });
            return; // nothing to connect yet
        }

        // Ensure AudioContext is running before creating MediaStreamSource
        if (this.audioContext.state === "suspended") {
            try {
                await this.audioContext.resume();
                console.log("[InputPCMStreamer] AudioContext resumed");
            } catch (e) {
                console.error("[InputPCMStreamer] Failed to resume AudioContext:", e);
                return;
            }
        }

        // Note: TypeScript types may not include "closed" but it's a valid state per Web Audio API spec
        const audioContextStateBeforeResume = this.audioContext.state as string;
        if (audioContextStateBeforeResume === "closed") {
            console.error("[InputPCMStreamer] AudioContext is closed, cannot create MediaStreamSource");
            return;
        }

        // Re-check entry after async resume to handle race conditions where stream might have been removed
        entry = this.mediaStreams.get(stream);
        if (!entry) {
            console.warn("[InputPCMStreamer] Stream was removed during async operations, aborting connection", {
                streamId: stream.id,
            });
            return;
        }
        if (entry.sourceNode) {
            console.log("[InputPCMStreamer] Source was connected during async operations for stream:", stream.id);
            return;
        }

        // Validate stream is still valid before creating MediaStreamSource
        try {
            // Check if AudioContext is in a valid state
            // Note: TypeScript types may not include "closed" but it's a valid state per Web Audio API spec
            const audioContextState = this.audioContext.state as string;
            if (audioContextState === "closed") {
                console.error("[InputPCMStreamer] AudioContext is closed, cannot create MediaStreamSource", {
                    streamId: stream.id,
                });
                return;
            }

            // Check if stream is still valid by accessing its id
            const streamId = stream.id;
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                console.log("[InputPCMStreamer] No audio tracks in stream, aborting connection", { streamId });
                return;
            }

            // Validate that all audio tracks are in a valid state
            const liveTracks = audioTracks.filter((t) => t.readyState === "live");
            if (liveTracks.length === 0) {
                console.log("[InputPCMStreamer] No live audio tracks in stream, aborting connection", {
                    streamId,
                    trackStates: audioTracks.map((t) => ({ id: t.id, readyState: t.readyState })),
                });
                return;
            }

            const audioTracksCount = liveTracks.length;
            console.log(
                `[InputPCMStreamer] 🔌 Connecting source - Stream ID: ${streamId}, Audio Tracks: ${audioTracksCount}, AudioContext state: ${this.audioContext.state}`,
                {
                    streamId: streamId,
                    audioTracksCount: audioTracksCount,
                    trackIds: liveTracks.map((t) => t.id),
                    trackStates: liveTracks.map((t) => t.readyState),
                    audioContextState: this.audioContext.state,
                }
            );

            // Ensure AudioContext is running before creating MediaStreamSource
            if (this.audioContext.state === "suspended") {
                try {
                    await this.audioContext.resume();
                    console.log("[InputPCMStreamer] AudioContext resumed before creating MediaStreamSource");
                } catch (resumeError) {
                    console.error(
                        "[InputPCMStreamer] Failed to resume AudioContext before creating MediaStreamSource:",
                        resumeError
                    );
                    return;
                }
            }

            // Re-check entry after async resume to handle race conditions
            entry = this.mediaStreams.get(stream);
            if (!entry || entry.sourceNode) {
                console.log("[InputPCMStreamer] Stream state changed during async operations, aborting connection", {
                    streamId: stream.id,
                    hasEntry: !!entry,
                    hasSourceNode: !!entry?.sourceNode,
                });
                return;
            }

            // Final check: ensure stream is still in our map before creating MediaStreamSource
            entry = this.mediaStreams.get(stream);
            if (!entry || entry.sourceNode) {
                console.log("[InputPCMStreamer] Stream state changed before creating MediaStreamSource, aborting", {
                    streamId: stream.id,
                    hasEntry: !!entry,
                    hasSourceNode: !!entry?.sourceNode,
                });
                return;
            }

            // Check if AudioContext is still valid
            if (this.audioContext.state === "closed") {
                console.error("[InputPCMStreamer] AudioContext is closed, cannot create MediaStreamSource", {
                    streamId: stream.id,
                });
                return;
            }

            const sourceNode = this.audioContext.createMediaStreamSource(stream);
            sourceNode.connect(this.workletNode);
            entry.sourceNode = sourceNode;
            console.log(
                `[InputPCMStreamer] ✅ Source connected successfully - Stream ID: ${streamId}, Audio Tracks: ${audioTracksCount}`
            );
        } catch (e) {
            console.error(
                "[InputPCMStreamer] Failed to create MediaStreamSource. Will retry when an audio track is available.",
                e,
                {
                    streamId: stream.id,
                    audioTracks: stream.getAudioTracks().length,
                    audioContextState: this.audioContext.state,
                    errorName: e instanceof Error ? e.name : "Unknown",
                    errorMessage: e instanceof Error ? e.message : String(e),
                    errorStack: e instanceof Error ? e.stack : undefined,
                }
            );
            // If AudioContext is in error state, we should not retry
            // Note: TypeScript types may not include "closed" but it's a valid state per Web Audio API spec
            const audioContextState = this.audioContext.state as string;
            if (audioContextState === "closed") {
                console.error("[InputPCMStreamer] AudioContext is closed, will not retry connection");
            }
        }
    }

    private disconnectAndDisposeSource(stream: MediaStream): void {
        const entry = this.mediaStreams.get(stream);
        if (!entry) return;
        if (entry.sourceNode) {
            try {
                if (this.workletNode) entry.sourceNode.disconnect(this.workletNode);
                else entry.sourceNode.disconnect();
            } catch {
                // ignore
            }
            entry.sourceNode = null;
        }
    }

    // Method to get the MediaStream that can be added to WebRTC
    public addMediaStream(mediaStream: MediaStream): void {
        if (!this.isWorkletLoaded || !this.workletNode) {
            console.error("[InputPCMStreamer] AudioWorklet is not loaded yet.");
            return;
        }

        if (this.mediaStreams.has(mediaStream)) {
            console.log("[InputPCMStreamer] Stream already managed:", mediaStream.id);
            // Already managed
            return;
        }

        const audioTracks = mediaStream.getAudioTracks();
        const audioTracksCount = audioTracks.length;
        console.log(
            `[InputPCMStreamer] 📥 Adding MediaStream - Stream ID: ${mediaStream.id}, Audio Tracks: ${audioTracksCount}`,
            {
                streamId: mediaStream.id,
                audioTracksCount: audioTracksCount,
                trackIds: audioTracks.map((t) => t.id),
                trackStates: audioTracks.map((t) => t.readyState),
            }
        );

        const entry = {
            sourceNode: null as MediaStreamAudioSourceNode | null,
            onAddTrack: (_ev: MediaStreamTrackEvent) => {},
            onRemoveTrack: (_ev: MediaStreamTrackEvent) => {},
            trackEndedHandlers: new Map<MediaStreamTrack, () => void>(),
        };

        // Define handlers (need entry in closure)
        entry.onAddTrack = (ev: MediaStreamTrackEvent) => {
            const track = ev.track;
            if (track.kind !== "audio") return;
            console.log("[InputPCMStreamer] Track added to stream:", {
                streamId: mediaStream.id,
                trackId: track.id,
                trackState: track.readyState,
            });
            const onEnded = () => {
                entry.trackEndedHandlers.delete(track);
                // If no more live audio, free the source node
                if (!this.hasLiveAudioTrack(mediaStream)) {
                    this.disconnectAndDisposeSource(mediaStream);
                }
            };
            track.addEventListener("ended", onEnded, { once: true });
            entry.trackEndedHandlers.set(track, onEnded);
            // Try (re)connecting now that an audio track exists
            this.ensureSourceConnected(mediaStream).catch((e) => {
                console.error("[InputPCMStreamer] Error in ensureSourceConnected after track added:", e);
            });
        };

        entry.onRemoveTrack = (ev: MediaStreamTrackEvent) => {
            const track = ev.track;
            if (track.kind !== "audio") return;
            console.log("[InputPCMStreamer] Track removed from stream:", {
                streamId: mediaStream.id,
                trackId: track.id,
            });
            const onEnded = entry.trackEndedHandlers.get(track);
            if (onEnded) {
                track.removeEventListener("ended", onEnded);
                entry.trackEndedHandlers.delete(track);
            }
            if (!this.hasLiveAudioTrack(mediaStream)) {
                this.disconnectAndDisposeSource(mediaStream);
            }
        };

        // Register listeners on the stream
        mediaStream.addEventListener("addtrack", entry.onAddTrack);
        mediaStream.addEventListener("removetrack", entry.onRemoveTrack);

        // Track existing audio tracks for ended cleanup and connect if possible
        const existingTracksCount = mediaStream.getAudioTracks().length;
        console.log(
            `[InputPCMStreamer] 📋 Tracking ${existingTracksCount} existing audio track(s) for stream: ${mediaStream.id}`
        );
        for (const t of mediaStream.getAudioTracks()) {
            console.log(`[InputPCMStreamer]   - Track ID: ${t.id}, State: ${t.readyState}`, {
                streamId: mediaStream.id,
                trackId: t.id,
                trackState: t.readyState,
            });
            const onEnded = () => {
                entry.trackEndedHandlers.delete(t);
                if (!this.hasLiveAudioTrack(mediaStream)) {
                    this.disconnectAndDisposeSource(mediaStream);
                }
            };
            t.addEventListener("ended", onEnded, { once: true });
            entry.trackEndedHandlers.set(t, onEnded);
        }

        this.mediaStreams.set(mediaStream, entry);

        // Connect immediately if an audio track is already present
        // This will connect all existing tracks in the stream
        this.ensureSourceConnected(mediaStream).catch((e) => {
            console.error("[InputPCMStreamer] Error in ensureSourceConnected after adding stream:", e);
        });
    }

    public removeMediaStream(mediaStream: MediaStream): void {
        const entry = this.mediaStreams.get(mediaStream);
        if (!entry) {
            console.error("[InputPCMStreamer] MediaStream not found. Unable to remove:", mediaStream.id);
            return;
        }

        console.log("[InputPCMStreamer] Removing MediaStream:", {
            streamId: mediaStream.id,
            audioTracksCount: mediaStream.getAudioTracks().length,
            hasSourceNode: !!entry.sourceNode,
        });

        // Store source node reference before clearing entry
        const sourceNodeToDisconnect = entry.sourceNode;

        // Remove stream-level listeners first to prevent new tracks from triggering ensureSourceConnected
        mediaStream.removeEventListener("addtrack", entry.onAddTrack);
        mediaStream.removeEventListener("removetrack", entry.onRemoveTrack);

        // Remove track-level listeners
        for (const [track, onEnded] of entry.trackEndedHandlers.entries()) {
            track.removeEventListener("ended", onEnded);
        }
        entry.trackEndedHandlers.clear();

        // Mark entry as being removed to prevent ensureSourceConnected from creating new source nodes
        // This prevents race conditions where ensureSourceConnected is called while stream is being removed
        entry.sourceNode = null;

        // Disconnect source if any (using stored reference)
        if (sourceNodeToDisconnect) {
            try {
                if (this.workletNode) {
                    sourceNodeToDisconnect.disconnect(this.workletNode);
                } else {
                    sourceNodeToDisconnect.disconnect();
                }
            } catch {
                // ignore disconnect errors
            }
        }

        this.mediaStreams.delete(mediaStream);
        console.log("[InputPCMStreamer] MediaStream removed:", mediaStream.id);
    }

    // Method to close the AudioWorkletNode and clean up resources
    public close(): void {
        // Clean up all managed MediaStreams (listeners + nodes)
        for (const stream of Array.from(this.mediaStreams.keys())) {
            this.removeMediaStream(stream);
        }

        if (this.workletNode) {
            // Disconnect the worklet node from the audio context
            this.workletNode.disconnect();
            this.workletNode.port.close(); // Close the MessagePort

            // Set the worklet node to null to avoid further use
            this.workletNode = null;
        }

        // Disconnect and cleanup keep-alive node
        if (this.keepAliveNode) {
            try {
                this.keepAliveNode.disconnect();
            } catch {
                // ignore
            }
            this.keepAliveNode = null;
        }

        // Remove state change handler
        if (this.audioContextStateChangeHandler) {
            this.audioContext.removeEventListener("statechange", this.audioContextStateChangeHandler);
            this.audioContextStateChangeHandler = null;
        }

        // Optionally, stop the AudioContext if no longer needed
        if (this.audioContext.state !== "closed") {
            this.audioContext
                .close()
                .then(() => {
                    customWebRTCLogger.info("AudioContext closed.");
                })
                .catch((err) => {
                    console.error("Error closing AudioContext:", err);
                });
        }

        this.isWorkletLoaded = false;
    }
}
