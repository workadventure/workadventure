import { FilterType } from "@workadventure/messages";
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

/**
 * Whether a space is one a meeting can happen in.
 *
 * A broadcast space is not, and that distinction is load-bearing for analytics: every
 * client of a world with a megaphone configured joins the megaphone space whether or not
 * anyone is broadcasting (`BroadcastService.joinSpace`), and the back answers that join
 * with the same `switchMessage` a real conversation gets — it picks its initial state on
 * media properties alone, with no participant count. Opening a meeting interval on it made
 * being connected enough to be counted as "in a meeting", for the whole connection.
 * Actual megaphone usage stays measured, by the `megaphone.*` events.
 *
 * `ALL_USERS` is what every conversation space is joined with — proximity bubbles
 * (`ProximityChatRoomManager`) and meeting areas (`AreasPropertiesListener`) — while the
 * megaphone and the speaker/listener areas use the `LIVE_STREAMING_*` ones.
 */
export function isMeetingSpace(filterType: FilterType): boolean {
    return filterType === FilterType.ALL_USERS;
}
