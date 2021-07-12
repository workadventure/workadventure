import type { LoadSoundEvent } from "../Events/LoadSoundEvent";
import type { PlaySoundEvent } from "../Events/PlaySoundEvent";
import type { StopSoundEvent } from "../Events/StopSoundEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { Sound } from "./Sound/Sound";

export class WorkadventureSoundCommands extends IframeApiContribution<WorkadventureSoundCommands> {
    callbacks = [];

    loadSound(url: string): Sound {
        return new Sound(url);
    }
}

export default new WorkadventureSoundCommands();
