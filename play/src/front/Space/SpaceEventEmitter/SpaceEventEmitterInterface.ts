import { SpaceUser, SpaceFilterMessage } from "@workadventure/messages";
export interface SpaceEventEmitterInterface {
    userLeaveSpace(spaceName: string, spaceUser: SpaceUser): void;
    userJoinSpace(spaceName: string, spaceUser: SpaceUser): void;
    updateSpaceMetadata(spaceName: string, metadata: string): void;
    //SpaceFilterEventEmitterInterface
    removeSpaceFilter(spaceName: string, filterName: string): void;
    updateSpaceFilter(SpaceFilter: SpaceFilterMessage): void;
    addSpaceFilter(newSpaceFilter: SpaceFilterMessage): void;
}
