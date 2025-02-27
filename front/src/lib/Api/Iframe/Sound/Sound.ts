import { sendToWorkadventure } from "../IframeApiContribution";
import type { LoadSoundEvent } from "../../Events/LoadSoundEvent";
import type { PlaySoundEvent } from "../../Events/PlaySoundEvent";
import type { StopSoundEvent } from "../../Events/StopSoundEvent";
//import SoundConfig = Phaser.Types.Sound.SoundConfig;

/**
 * A copy of the SoundConfig type from Phaser
 */
export type SoundConfig = {
    /**
     * Boolean indicating whether the sound should be muted or not.
     */
    mute?: boolean;
    /**
     * A value between 0 (silence) and 1 (full volume).
     */
    volume?: number;
    /**
     * Defines the speed at which the sound should be played.
     */
    rate?: number;
    /**
     * Represents detuning of sound in [cents](https://en.wikipedia.org/wiki/Cent_%28music%29).
     */
    detune?: number;
    /**
     * Position of playback for this sound, in seconds.
     */
    seek?: number;
    /**
     * Whether or not the sound or current sound marker should loop.
     */
    loop?: boolean;
    /**
     * Time, in seconds, that should elapse before the sound actually starts its playback.
     */
    delay?: number;
    /**
     * A value between -1 (full left pan) and 1 (full right pan). 0 means no pan.
     */
    pan?: number;
};

export class Sound {
    constructor(private url: string) {
        sendToWorkadventure({
            type: "loadSound",
            data: {
                url: this.url,
            } as LoadSoundEvent,
        });
    }

    public play(config: SoundConfig | undefined) {
        sendToWorkadventure({
            type: "playSound",
            data: {
                url: this.url,
                config,
            } as PlaySoundEvent,
        });
        return this.url;
    }
    public stop() {
        sendToWorkadventure({
            type: "stopSound",
            data: {
                url: this.url,
            } as StopSoundEvent,
        });
        return this.url;
    }
}
