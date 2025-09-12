import { IframeApiContribution, openMessagePort } from "./IframeApiContribution";
import { Space } from "./Spaces/Space";

export class WorkAdventureSpacesCommands extends IframeApiContribution<WorkAdventureSpacesCommands> {
    callbacks = [];

    /**
     * Joins a space.
     * A space is a structure containing a set of players.
     * Players in a space can talk to each others.
     *
     * Use this if you want some players to be able to talk to each others without going through a bubble or a meeting room.
     * Note: users in the same world, but on different maps, can be part of the same space.
     * The spaceName is scope to the world.
     *
     * {@link https://docs.workadventu.re/map-building/api-spaces.md#start-following-player | Website documentation}
     *
     * @param {string} spaceName Name of the space to join
     * @param {("everyone"|"streaming")} filterType Type of filter to apply when joining the space. This must match the filter decided by the first person joining the space.
     * @param {string[]} propertiesToSync List of properties to listen to. You will be notified if any of these properties change when synchronizing in the space.
     */
    public async joinSpace(
        spaceName: string,
        filterType: "everyone" | "streaming",
        propertiesToSync: string[]
    ): Promise<Space> {
        const port = await openMessagePort("joinSpace", { spaceName, filterType, propertiesToSync });

        return new Space(port);
    }
}

export default new WorkAdventureSpacesCommands();
