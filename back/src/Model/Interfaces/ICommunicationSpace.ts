import type { Space } from "../Space";

export type ICommunicationSpace = Pick<
    Space,
    | "getAllUsers"
    | "getUsersInFilter"
    | "getUsersToNotify"
    | "dispatchPrivateEvent"
    | "dispatchPublicEvent"
    | "getSpaceName"
    | "getPropertiesToSync"
    | "updateMetadata"
    | "getUser"
>;
