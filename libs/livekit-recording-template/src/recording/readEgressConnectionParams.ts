import EgressHelper from "@livekit/egress-sdk";

export type EgressConnectionParams = {
    /** WebSocket URL of the LiveKit server (query param `url`). */
    serverUrl: string;
    /** JWT used by the egress recorder participant (query param `token`). */
    token: string;
    /** Layout hint from egress (`layout` query param or participant metadata). */
    layout: string;
};

/**
 * Reads connection parameters injected by LiveKit Room Composite egress into the page URL.
 * @see https://docs.livekit.io/home/egress/custom-template/
 */
export function readEgressConnectionParams(): EgressConnectionParams {
    return {
        serverUrl: EgressHelper.getLiveKitURL(),
        token: EgressHelper.getAccessToken(),
        layout: EgressHelper.getLayout(),
    };
}
