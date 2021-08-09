import type { LoadSoundEvent } from "../Events/LoadSoundEvent";
import type { PlaySoundEvent } from "../Events/PlaySoundEvent";
import type { StopSoundEvent } from "../Events/StopSoundEvent";
import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "./IframeApiContribution";
import { Sound } from "./Sound/Sound";
import { EmbeddedWebsite } from "./Room/EmbeddedWebsite";
import type { CreateEmbeddedWebsiteEvent } from "../Events/EmbeddedWebsiteEvent";

export class WorkadventureRoomWebsiteCommands extends IframeApiContribution<WorkadventureRoomWebsiteCommands> {
    callbacks = [];

    async get(objectName: string): Promise<EmbeddedWebsite> {
        const websiteEvent = await queryWorkadventure({
            type: "getEmbeddedWebsite",
            data: objectName,
        });
        return new EmbeddedWebsite(websiteEvent);
    }

    create(createEmbeddedWebsiteEvent: CreateEmbeddedWebsiteEvent): EmbeddedWebsite {
        queryWorkadventure({
            type: "createEmbeddedWebsite",
            data: createEmbeddedWebsiteEvent,
        }).catch((e) => {
            console.error(e);
        });
        return new EmbeddedWebsite(createEmbeddedWebsiteEvent);
    }

    async delete(objectName: string): Promise<void> {
        return await queryWorkadventure({
            type: "deleteEmbeddedWebsite",
            data: objectName,
        });
    }
}

export default new WorkadventureRoomWebsiteCommands();
