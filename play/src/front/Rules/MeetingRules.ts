import type { AreaDataProperties, AreaDataPropertiesKeys } from "@workadventure/map-editor";
import type { ExtensionModule, ExtensionModuleAreaProperty } from "../ExternalModule/ExtensionModule";

/**
 * An area hosts a single meeting at a time, so these property types all conflict with each other.
 * Extension modules (Teams, Google Meet, ...) join the list through their `isMeeting` flag.
 */
const MEETING_PROPERTY_TYPES: AreaDataPropertiesKeys[] = [
    "jitsiRoomProperty",
    "livekitRoomProperty",
    "speakerMegaphone",
    "listenerMegaphone",
];

export type AreaMapEditors = { [subtype: string]: ExtensionModuleAreaProperty };

/** The area properties declared by the loaded extension modules, those declaring none left out. */
export function getAreaMapEditors(extensionModules: ExtensionModule[]): AreaMapEditors[] {
    return extensionModules
        .map((extensionModule) => extensionModule.areaMapEditor?.())
        .filter((areaMapEditor) => areaMapEditor !== undefined);
}

export function hasMeetingProperty(properties: AreaDataProperties, areaMapEditors: AreaMapEditors[]): boolean {
    return properties.some((property) =>
        property.type === "extensionModule"
            ? areaMapEditors.some((areaMapEditor) => areaMapEditor[property.subtype]?.isMeeting)
            : MEETING_PROPERTY_TYPES.includes(property.type),
    );
}
