class OutputAudioWorkletProcessor extends AudioWorkletProcessor {
    private audioQueue: Float32Array[] = [];

    constructor() {
        super();
        this.port.onmessage = (event: MessageEvent) => {
            if (event.data.emptyBuffer === true) {
                this.audioQueue = [];
            } else {
                const data = event.data.pcmData;
                if (data instanceof Float32Array) {
                    this.audioQueue.push(data);
                } else {
                    console.error("Invalid data type received in worklet", event.data);
                }
            }
        };
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
        const output = outputs[0];
        const outputData = output[0];

        let nextChunk: Float32Array | undefined;
        let currentOffset = 0;
        // eslint-disable-next-line no-cond-assign
        while ((nextChunk = this.audioQueue[0])) {
            if (currentOffset + nextChunk.length <= outputData.length) {
                outputData.set(nextChunk, currentOffset);
                currentOffset += nextChunk.length;
                this.audioQueue.shift();
            } else {
                outputData.set(nextChunk.subarray(0, outputData.length - currentOffset), currentOffset);
                this.audioQueue[0] = nextChunk.subarray(outputData.length - currentOffset);
                break;
            }
        }

        return true; // Keep processor alive
    }
}

// Required registration for the worklet
registerProcessor("output-pcm-worklet-processor", OutputAudioWorkletProcessor);
export {};
