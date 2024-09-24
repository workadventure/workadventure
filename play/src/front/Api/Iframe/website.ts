import type { CreateEmbeddedWebsiteEvent } from "../Events/EmbeddedWebsiteEvent";
import { IframeApiContribution, queryWorkadventure } from "./IframeApiContribution";
import { EmbeddedWebsite } from "./Room/EmbeddedWebsite";

export class WorkadventureRoomWebsiteCommands extends IframeApiContribution<WorkadventureRoomWebsiteCommands> {
    callbacks = [];

    /**
     * You can get an instance of an embedded website by using the WA.room.website.get() method. It returns a promise of an EmbeddedWebsite instance.
     * {@link https://docs.workadventu.re/map-building/api-room.md#getting-an-instance-of-a-website-already-embedded-in-the-map | Website documentation}
     *
     * @param {string} objectName Object name
     * @returns {Promise<EmbeddedWebsite>} Promise to get a embed website
     */
    async get(objectName: string): Promise<EmbeddedWebsite> {
        const websiteEvent = await queryWorkadventure({
            type: "getEmbeddedWebsite",
            data: objectName,
        });
        return new EmbeddedWebsite(websiteEvent);
    }

    /**
     * You can create an instance of an embedded website by using the WA.room.website.create() method. It returns an EmbeddedWebsite instance.
     * {@link https://docs.workadventu.re/map-building/api-room.md#adding-a-new-website-in-a-map | Website documentation}
     *
     * @param createEmbeddedWebsiteEvent
     * @returns {EmbeddedWebsite} Created embed website
     */
    create(createEmbeddedWebsiteEvent: CreateEmbeddedWebsiteEvent): EmbeddedWebsite {
        queryWorkadventure({
            type: "createEmbeddedWebsite",
            data: createEmbeddedWebsiteEvent,
        }).catch((e) => {
            console.error(e);
        });
        return new EmbeddedWebsite(createEmbeddedWebsiteEvent);
    }

    /**
     * Use WA.room.website.delete to completely remove an embedded website from your map.
     * {@link https://docs.workadventu.re/map-building/api-room.md#deleting-a-website-from-a-map | Website documentation}
     *
     * @param {string} objectName Object name
     * @returns {Promise<void>} Promise to away to known when the object has been deleted
     */
    async delete(objectName: string): Promise<void> {
        return await queryWorkadventure({
            type: "deleteEmbeddedWebsite",
            data: objectName,
        });
    }
}

export default new WorkadventureRoomWebsiteCommands();
