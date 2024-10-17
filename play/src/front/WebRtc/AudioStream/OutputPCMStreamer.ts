import audioWorkletProcessorUrl from "./OutputAudioWorkletProcessor.ts?worker&url";

export class OutputPCMStreamer {
    private readonly audioContext: AudioContext;
    private readonly mediaStreamDestination: MediaStreamAudioDestinationNode;
    private workletNode: AudioWorkletNode | null = null;
    private isWorkletLoaded = false;

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

    // Method to append new PCM data (Int16Array) to the audio stream
    public appendPCMData(float32Array: Float32Array): void {
        if (!this.isWorkletLoaded || !this.workletNode) {
            console.error("AudioWorklet is not loaded yet.");
            return;
        }

        // Send the PCM data to the AudioWorkletProcessor via its port
        this.workletNode.port.postMessage({ pcmData: float32Array }, { transfer: [float32Array.buffer] });
    }

    public resetAudioBuffer(): void {
        if (!this.isWorkletLoaded || !this.workletNode) {
            console.error("AudioWorklet is not loaded yet.");
            return;
        }

        // Send the PCM data to the AudioWorkletProcessor via its port
        this.workletNode.port.postMessage({ emptyBuffer: true });
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
                    console.log("AudioContext closed.");
                })
                .catch((err) => {
                    console.error("Error closing AudioContext:", err);
                });
        }

        this.isWorkletLoaded = false;
    }
}
