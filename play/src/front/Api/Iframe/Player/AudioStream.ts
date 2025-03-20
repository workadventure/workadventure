import { queryWorkadventure } from "../IframeApiContribution";

export class AudioStream {
    public appendAudioData(float32Array: Float32Array): Promise<void> {
        return queryWorkadventure(
            {
                type: "appendPCMData",
                data: {
                    data: float32Array as Float32Array<ArrayBuffer>,
                },
            },
            [float32Array.buffer]
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
