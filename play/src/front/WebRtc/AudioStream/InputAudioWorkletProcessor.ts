class InputAudioWorkletProcessor extends AudioWorkletProcessor {
    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
        if (!inputs || inputs.length === 0 || inputs[0].length === 0) {
            return true; // Keep processor alive
        }

        // Let's merge all the inputs in one big Float32Array by summing them
        const mergedInput = new Float32Array(inputs[0][0].length);

        for (let k = 0; k < inputs.length; k++) {
            const input = inputs[k];
            const channelNumber = input.length;
            for (let j = 0; j < channelNumber; j++) {
                const channel = input[j];
                for (let i = 0; i < channel.length; i++) {
                    // We are dividing by the number of channels to avoid clipping
                    // Clipping could still happen if the sum of all the inputs is too high
                    mergedInput[i] += channel[i] / channelNumber;
                }
            }
        }

        this.port.postMessage({ pcmData: mergedInput }, { transfer: [mergedInput.buffer] });

        return true; // Keep processor alive
    }
}

// Required registration for the worklet
registerProcessor("input-pcm-worklet-processor", InputAudioWorkletProcessor);
export {};
