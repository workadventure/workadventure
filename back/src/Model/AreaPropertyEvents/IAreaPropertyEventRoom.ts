import type { AreaData, WAMFileFormat } from "@workadventure/map-editor";
import type { PointInterface } from "../Websocket/PointInterface";

/**
 * Interface that GameRoom must satisfy for the AreaPropertyEventManager
 * to apply area-empty and area-geometry-change behaviors without depending on GameRoom directly.
 */
export interface IAreaPropertyEventRoom {
    getWam(): WAMFileFormat | undefined;
    getAreasWithPropertyTypesContainingPosition(
        position: PointInterface,
        propertyTypes: string[]
    ): Promise<Array<{ areaId: string; propertyId: string; propertyType: string }>>;
    hasUsersInArea(area: AreaData): boolean;
    setAreaPropertyVariable(areaId: string, propertyId: string, key: string, value: string): boolean;
    getAreaPropertyVariable(areaId: string, propertyId: string, key: string): string | undefined;
}
