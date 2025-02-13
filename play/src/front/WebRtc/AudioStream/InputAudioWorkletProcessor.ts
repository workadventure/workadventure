class InputAudioWorkletProcessor extends AudioWorkletProcessor {
    private readonly threshold: number = 0.02;
    private readonly voiceState: boolean[] = [];

    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
        if (!inputs || inputs.length === 0 || inputs[0].length === 0) {
            return true; // Keep processor alive
        }

        // Let's merge all the inputs in one big Float32Array by summing them
        const mergedInput = new Float32Array(inputs[0][0].length);

        // FIXME: there is only 1 input taken into account
        for (let k = 0; k < inputs.length; k++) {
            const input = inputs[k];
            const channelNumber = input.length;
            const rmsPerChannel: number[] = [];
            console.log("channels number", k, channelNumber);
            for (let j = 0; j < channelNumber; j++) {

                const channel = input[j];
                let sum = 0;
                for (let i = 0; i < channel.length; i++) {
                    // We are dividing by the number of channels to avoid clipping
                    // Clipping could still happen if the sum of all the inputs is too high
                    mergedInput[i] += channel[i] / channelNumber;
                    sum += channel[i] * channel[i];
                }

                rmsPerChannel.push(Math.sqrt(sum / channel.length));
            }
            const averageRms = rmsPerChannel.reduce((a, b) => a + b, 0) / rmsPerChannel.length;
            if (averageRms > this.threshold && !this.voiceState[k]) {
                this.voiceState[k] = true;
                this.port.postMessage({ event: 'voiceStart', channel: k });
            } else if (averageRms <= this.threshold && this.voiceState[k]) {
                this.voiceState[k] = false;
                this.port.postMessage({ event: 'voiceStop', channel: k });
            }
        }

        this.port.postMessage({ pcmData: mergedInput }, { transfer: [mergedInput.buffer] });

        return true; // Keep processor alive
    }
}

// Required registration for the worklet
registerProcessor("input-pcm-worklet-processor", InputAudioWorkletProcessor);
export {};
