import type { Space } from "../Space.ts";

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
