import { queryWorkadventure } from "../IframeApiContribution";

export class AudioStream {
    /**
     * Append raw PCM audio data to the audio stream.
     * The promise resolves when the sound is played. If the audio buffer is reset with resetAudioBuffer before
     * the data was played, the promise will reject.
     */
    public appendAudioData(float32Array: Float32Array): Promise<void> {
        return queryWorkadventure(
            {
                type: "appendPCMData",
                data: {
                    data: float32Array as Float32Array<ArrayBuffer>,
                },
            },
            {
                transfer: [float32Array.buffer],
                timeout: null,
            }
        );
    }

    public async resetAudioBuffer(): Promise<void> {
        await queryWorkadventure({
            type: "resetAudioBuffer",
            data: undefined,
        });
    }

    public close(): Promise<void> {
        return queryWorkadventure({
            type: "stopStreamInBubble",
            data: undefined,
        });
    }
}
