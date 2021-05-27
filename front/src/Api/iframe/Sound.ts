import type { LoadSoundEvent } from '../Events/LoadSoundEvent';
import type { PlaySoundEvent } from '../Events/PlaySoundEvent';
import type { StopSoundEvent } from '../Events/StopSoundEvent';
import { IframeApiContribution, sendToWorkadventure } from './IframeApiContribution';
import SoundConfig = Phaser.Types.Sound.SoundConfig;

export class Sound {
    constructor(private url: string) {
        sendToWorkadventure({
            "type": 'loadSound',
            "data": {
                url: this.url,
            } as LoadSoundEvent

        });
    }

    public play(config: SoundConfig) {
        sendToWorkadventure({
            "type": 'playSound',
            "data": {
                url: this.url,
                config
            } as PlaySoundEvent

        });
        return this.url;
    }
    public stop() {
        sendToWorkadventure({
            "type": 'stopSound',
            "data": {
                url: this.url,
            } as StopSoundEvent

        });
        return this.url;
    }

}



class WorkadventureSoundCommands extends IframeApiContribution<WorkadventureSoundCommands> {

    readonly subObjectIdentifier = "sound"

    readonly addMethodsAtRoot = true
    callbacks = []


    loadSound(url: string): Sound {
        return new Sound(url);
    }

}


export default new WorkadventureSoundCommands();