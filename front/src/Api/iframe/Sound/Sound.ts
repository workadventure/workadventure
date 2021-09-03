import { sendToWorkadventure } from "../IframeApiContribution";
import type { LoadSoundEvent } from "../../Events/LoadSoundEvent";
import type { PlaySoundEvent } from "../../Events/PlaySoundEvent";
import type { StopSoundEvent } from "../../Events/StopSoundEvent";
import SoundConfig = Phaser.Types.Sound.SoundConfig;

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
