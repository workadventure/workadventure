import { queryWorkadventure } from "../IframeApiContribution";

export class AudioStream {
    public constructor(private readonly meetingId?: string) {}

    /**
     * Append raw PCM audio data to the audio stream.
     * The promise resolves when the sound is played. If the audio buffer is reset with resetAudioBuffer before
     * the data was played, the promise will reject.
     */
    public appendAudioData(float32Array: Float32Array): Promise<void> {
        if (this.meetingId !== undefined) {
            return queryWorkadventure(
                {
                    type: "appendPCMDataToMeeting",
                    data: {
                        meetingId: this.meetingId,
                        data: float32Array as Float32Array<ArrayBuffer>,
                    },
                },
                {
                    transfer: [float32Array.buffer],
                    timeout: null,
                },
            );
        }

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
            },
        );
    }

    public async resetAudioBuffer(): Promise<void> {
        if (this.meetingId !== undefined) {
            await queryWorkadventure({
                type: "resetMeetingAudioBuffer",
                data: {
                    meetingId: this.meetingId,
                },
            });
            return;
        }

        await queryWorkadventure({
            type: "resetAudioBuffer",
            data: undefined,
        });
    }

    public close(): Promise<void> {
        if (this.meetingId !== undefined) {
            return queryWorkadventure({
                type: "stopStreamInMeeting",
                data: {
                    meetingId: this.meetingId,
                },
            });
        }

        return queryWorkadventure({
            type: "stopStreamInBubble",
            data: undefined,
        });
    }
}
