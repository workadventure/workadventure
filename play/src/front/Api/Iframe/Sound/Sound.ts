import type * as Phaser from "phaser";
import { sendToWorkadventure } from "../IframeApiContribution";

export class Sound {
    constructor(private url: string) {
        sendToWorkadventure({
            type: "loadSound",
            data: {
                url: this.url,
            },
        });
    }

    public play(config: Phaser.Types.Sound.SoundConfig | undefined) {
        sendToWorkadventure({
            type: "playSound",
            data: {
                url: this.url,
                config,
            },
        });
        return this.url;
    }
    public stop() {
        sendToWorkadventure({
            type: "stopSound",
            data: {
                url: this.url,
            },
        });
        return this.url;
    }
}
