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
    | "updateState"
    | "stopRecordingByServer"
    | "getUser"
    // What the session analytics need and the transport does not: the world a row
    // belongs to, the kind this space's clients declared (in the state), and the filter — which
    // says whether "active" means "on air" or just "present".
    | "world"
    | "getState"
    | "filterType"
>;
