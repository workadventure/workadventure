import { Subject } from "rxjs";
import { audioContextManager } from "../AudioContextManager";
import audioWorkletProcessorUrl from "./InputAudioWorkletProcessor.ts?worker&url";

export class InputPCMStreamer {
    private readonly audioContext: AudioContext;
    private workletNode: AudioWorkletNode | null = null;
    private isWorkletLoaded = false;
    private readonly _pcmDataStream: Subject<Float32Array> = new Subject();
    public readonly pcmDataStream = this._pcmDataStream.asObservable();

    constructor(sampleRate = 24000) {
        this.audioContext = audioContextManager.getContext(sampleRate);
    }

    // Initialize the AudioWorklet and load the processor script
    public async initWorklet() {
        if (!this.isWorkletLoaded) {
            try {
                await this.audioContext.resume();
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

    private ensureSourceConnected(stream: MediaStream): void {
        const entry = this.mediaStreams.get(stream);
        if (!entry || !this.isWorkletLoaded || !this.workletNode) return;
        if (entry.sourceNode) return; // already connected
        if (!this.hasLiveAudioTrack(stream)) return; // nothing to connect yet

        try {
            const sourceNode = this.audioContext.createMediaStreamSource(stream);
            sourceNode.connect(this.workletNode);
            entry.sourceNode = sourceNode;
        } catch (e) {
            console.error("Failed to create MediaStreamSource. Will retry when an audio track is available.", e);
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
            console.error("AudioWorklet is not loaded yet.");
            return;
        }

        if (this.mediaStreams.has(mediaStream)) {
            // Already managed
            return;
        }

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
            this.ensureSourceConnected(mediaStream);
        };

        entry.onRemoveTrack = (ev: MediaStreamTrackEvent) => {
            const track = ev.track;
            if (track.kind !== "audio") return;
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
        for (const t of mediaStream.getAudioTracks()) {
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
        this.ensureSourceConnected(mediaStream);
    }

    public removeMediaStream(mediaStream: MediaStream): void {
        const entry = this.mediaStreams.get(mediaStream);
        if (!entry) {
            console.error("MediaStream not found. Unable to remove.");
            return;
        }

        // Remove stream-level listeners
        mediaStream.removeEventListener("addtrack", entry.onAddTrack);
        mediaStream.removeEventListener("removetrack", entry.onRemoveTrack);

        // Remove track-level listeners
        for (const [track, onEnded] of entry.trackEndedHandlers.entries()) {
            track.removeEventListener("ended", onEnded);
        }
        entry.trackEndedHandlers.clear();

        // Disconnect source if any
        this.disconnectAndDisposeSource(mediaStream);

        this.mediaStreams.delete(mediaStream);
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

        // Note: We don't close the shared AudioContext here as it might be used by other components
        // The AudioContextManager will handle cleanup when appropriate

        this.isWorkletLoaded = false;
    }
}
