import { Deferred } from "ts-deferred";
import { customWebRTCLogger } from "../CustomWebRTCLogger";
import audioWorkletProcessorUrl from "./OutputAudioWorkletProcessor.ts?worker&url";

export class OutputPCMStreamer {
    private readonly audioContext: AudioContext;
    private readonly mediaStreamDestination: MediaStreamAudioDestinationNode;
    private workletNode: AudioWorkletNode | null = null;
    private isWorkletLoaded = false;
    // Counter to keep track of the last ID that was sent to the AudioWorkletProcessor
    private currentPcmDataId = 0;
    // A map to store the promises that resolve when the audio data is played
    private readonly audioSentPromises: Map<number, Deferred<void>> = new Map<number, Deferred<void>>();

    constructor(sampleRate = 24000) {
        this.audioContext = new AudioContext({ sampleRate });
        this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();
    }

    // Initialize the AudioWorklet and load the processor script
    public async initWorklet() {
        if (!this.isWorkletLoaded) {
            try {
                await this.audioContext.resume();
                await this.audioContext.audioWorklet.addModule(audioWorkletProcessorUrl);
                this.workletNode = new AudioWorkletNode(this.audioContext, "output-pcm-worklet-processor");
                this.workletNode.connect(this.mediaStreamDestination);

                this.workletNode.port.onmessage = (event: MessageEvent) => {
                    if (event.data.playedId !== undefined) {
                        const deferred = this.audioSentPromises.get(event.data.playedId);
                        deferred?.resolve();
                        this.audioSentPromises.delete(event.data.playedId);
                    }
                };

                this.isWorkletLoaded = true;
            } catch (err) {
                console.error("Failed to load AudioWorkletProcessor:", err);
            }
        }
    }

    // Method to get the MediaStream that can be added to WebRTC
    public getMediaStream(): MediaStream {
        return this.mediaStreamDestination.stream;
    }

    /**
     * Method to append new PCM data to the audio stream.
     * The promise resolves when the sound is played. If the audio buffer is reset with resetAudioBuffer before
     * the data was played, the promise will reject.
     * @param float32Array
     */
    public appendPCMData(float32Array: Float32Array): Promise<void> {
        if (!this.isWorkletLoaded || !this.workletNode) {
            return Promise.reject(new Error("AudioWorklet is not loaded yet."));
        }

        // Send the PCM data to the AudioWorkletProcessor via its port
        this.workletNode.port.postMessage(
            { pcmData: float32Array, id: this.currentPcmDataId },
            { transfer: [float32Array.buffer] }
        );
        const deferred = new Deferred<void>();
        this.audioSentPromises.set(this.currentPcmDataId, deferred);
        this.currentPcmDataId++;
        return deferred.promise;
    }

    private rejectNotPlayingData(): void {
        for (const deferred of this.audioSentPromises.values()) {
            deferred.reject(new Error("Audio buffer was reset before the data was played."));
        }
        this.audioSentPromises.clear();
    }

    public resetAudioBuffer(): void {
        if (!this.isWorkletLoaded || !this.workletNode) {
            console.error("AudioWorklet is not loaded yet.");
            return;
        }

        // Send the PCM data to the AudioWorkletProcessor via its port
        this.workletNode.port.postMessage({ emptyBuffer: true });

        this.rejectNotPlayingData();
    }

    // Method to close the AudioWorkletNode and clean up resources
    public close(): void {
        if (this.workletNode) {
            // Disconnect the worklet node from the audio context
            this.workletNode.disconnect();
            this.workletNode.port.close(); // Close the MessagePort

            // Set the worklet node to null to avoid further use
            this.workletNode = null;

            this.rejectNotPlayingData();
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
