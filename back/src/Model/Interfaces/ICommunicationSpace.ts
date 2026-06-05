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
    | "filterType"
    | "getPropertiesToSync"
    | "publishMetadata"
    | "stopRecordingByServer"
    | "getUser"
>;
