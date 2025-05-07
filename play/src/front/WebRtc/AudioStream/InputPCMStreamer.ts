import { Subject } from "rxjs";
import { customWebRTCLogger } from "../CustomWebRTCLogger";
import audioWorkletProcessorUrl from "./InputAudioWorkletProcessor.ts?worker&url";

export class InputPCMStreamer {
    private readonly audioContext: AudioContext;
    private workletNode: AudioWorkletNode | null = null;
    private isWorkletLoaded = false;
    private readonly _pcmDataStream: Subject<Float32Array> = new Subject();
    public readonly pcmDataStream = this._pcmDataStream.asObservable();

    constructor(sampleRate = 24000) {
        this.audioContext = new AudioContext({ sampleRate });
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

    private mediaStreams: Map<MediaStream, MediaStreamAudioSourceNode> = new Map();

    // Method to get the MediaStream that can be added to WebRTC
    public addMediaStream(mediaStream: MediaStream): void {
        if (!this.isWorkletLoaded || !this.workletNode) {
            console.error("AudioWorklet is not loaded yet.");
            return;
        }

        const sourceNode = this.audioContext.createMediaStreamSource(mediaStream);
        this.mediaStreams.set(mediaStream, sourceNode);
        sourceNode.connect(this.workletNode);
    }

    public removeMediaStream(mediaStream: MediaStream): void {
        if (!this.isWorkletLoaded || !this.workletNode) {
            console.error("AudioWorklet is not loaded yet.");
            return;
        }
        const sourceNode = this.mediaStreams.get(mediaStream);
        if (!sourceNode) {
            console.error("MediaStream not found. Unable to remove.");
            return;
        }

        sourceNode.disconnect(this.workletNode);
        this.mediaStreams.delete(mediaStream);
    }

    // Method to close the AudioWorkletNode and clean up resources
    public close(): void {
        if (this.workletNode) {
            // Disconnect the worklet node from the audio context
            this.workletNode.disconnect();
            this.workletNode.port.close(); // Close the MessagePort

            // Set the worklet node to null to avoid further use
            this.workletNode = null;
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
