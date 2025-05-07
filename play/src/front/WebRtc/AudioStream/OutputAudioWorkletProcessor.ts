interface PCMData {
    pcmData: Float32Array;
    id: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPcmData(data: any): data is PCMData {
    return typeof data === "object" && data.pcmData instanceof Float32Array && typeof data.id === "number";
}

class OutputAudioWorkletProcessor extends AudioWorkletProcessor {
    private audioQueue: PCMData[] = [];

    constructor() {
        super();
        this.port.onmessage = (event: MessageEvent) => {
            if (event.data.emptyBuffer === true) {
                this.audioQueue = [];
            } else if (isPcmData(event.data)) {
                this.audioQueue.push(event.data);
            } else {
                console.error("Invalid data type received in worklet", event.data);
            }
        };
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
        const output = outputs[0];
        const outputData = output[0];

        let nextChunk: PCMData | undefined;
        let currentOffset = 0;

        while ((nextChunk = this.audioQueue[0])) {
            if (currentOffset + nextChunk.pcmData.length <= outputData.length) {
                outputData.set(nextChunk.pcmData, currentOffset);
                currentOffset += nextChunk.pcmData.length;
                const id = nextChunk.id;
                // Send the acknoledgement back to the main thread
                this.port.postMessage({ playedId: id });
                this.audioQueue.shift();
            } else {
                outputData.set(nextChunk.pcmData.subarray(0, outputData.length - currentOffset), currentOffset);
                this.audioQueue[0].pcmData = nextChunk.pcmData.subarray(outputData.length - currentOffset);
                break;
            }
        }

        return true; // Keep processor alive
    }
}

// Required registration for the worklet
registerProcessor("output-pcm-worklet-processor", OutputAudioWorkletProcessor);
export {};
