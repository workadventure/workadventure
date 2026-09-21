import type { Space } from "../Space";

export type ICommunicationSpace = Pick<
    Space,
    | "getAllUsers"
    | "getUsersInFilter"
    | "getUsersToNotify"
    | "getRecordingState"
    | "dispatchPrivateEvent"
    | "dispatchPublicEvent"
    | "getSpaceName"
    | "getPropertiesToSync"
    | "publishMetadata"
    | "stopRecordingByServer"
    | "getUser"
    // What the session analytics need and the transport does not: the world a row
    // belongs to, and the `spaceKind` this space's client declared.
    | "world"
    | "getMetadataValue"
>;
