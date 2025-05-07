import { AreaData } from "@workadventure/map-editor";

export interface MapEditorArea {
    id: string;
    name: string;
    description: string | undefined;
    x: number;
    y: number;
    width: number;
    height: number;
    searchable: boolean | undefined;
}

export function toMapEditorArea(area: AreaData): MapEditorArea {
    const descriptionProperty = area.properties.find((property) => property.type === "areaDescriptionProperties");
    return {
        id: area.id,
        name: area.name,
        description: descriptionProperty?.description,
        searchable: descriptionProperty?.searchable,
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
    };
}
