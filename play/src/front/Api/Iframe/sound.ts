import { IframeApiContribution } from "./IframeApiContribution";
import { Sound } from "./Sound/Sound";

export class WorkadventureSoundCommands extends IframeApiContribution<WorkadventureSoundCommands> {
    callbacks = [];

    /**
     * Load a sound from an url.
     *
     * Please note that loadSound returns an object of the Sound class.
     *
     * The Sound class that represents a loaded sound contains two methods: play(soundConfig : SoundConfig|undefined) and stop().
     *
     * The parameter soundConfig is optional, if you call play without a Sound config the sound will be played with the basic configuration.
     * {@link https://docs.workadventu.re/map-building/api-sound.md#load-a-sound-from-an-url | Website documentation}
     *
     * @param url
     * @returns
     */
    loadSound(url: string): Sound {
        return new Sound(url);
    }
}

export default new WorkadventureSoundCommands();
