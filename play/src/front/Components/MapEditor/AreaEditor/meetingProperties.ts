import type { AreaDataProperties, AreaDataPropertiesKeys } from "@workadventure/map-editor";
import type { ExtensionModuleAreaProperty } from "../../../ExternalModule/ExtensionModule";

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

export function hasMeetingProperty(
    properties: AreaDataProperties,
    extensionModulesAreaMapEditor: { [subtype: string]: ExtensionModuleAreaProperty }[],
): boolean {
    return properties.some((property) =>
        property.type === "extensionModule"
            ? extensionModulesAreaMapEditor.some((areaMapEditor) => areaMapEditor[property.subtype]?.isMeeting)
            : MEETING_PROPERTY_TYPES.includes(property.type),
    );
}
