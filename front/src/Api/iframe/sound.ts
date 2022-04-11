import { IframeApiContribution } from "./IframeApiContribution";
import { Sound } from "./Sound/Sound";

export class WorkadventureSoundCommands extends IframeApiContribution<WorkadventureSoundCommands> {
    callbacks = [];

    loadSound(url: string): Sound {
        return new Sound(url);
    }
}

export default new WorkadventureSoundCommands();
