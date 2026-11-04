import { TokenVerifier } from "livekit-server-sdk";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../Enum/EnvironmentVariable";

/**
 * The ?recorder page is the LiveKit egress filming the map: the egress hands it a LiveKit token with the "recorder"
 * grant. Only that token makes a connection invisible, so nobody can hide in a room without our LiveKit secret.
 * Throws if the token is not a valid recorder token.
 */
export async function verifyRecorderToken(token: string): Promise<void> {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        throw new Error("Recorder connection refused: LiveKit is not configured");
    }
    const claims = await new TokenVerifier(LIVEKIT_API_KEY, LIVEKIT_API_SECRET).verify(token);
    if (claims.video?.recorder !== true) {
        throw new Error("Recorder connection refused: the token has no recorder grant");
    }
}

/**
 * The page the egress opens to film a space over the map: the map of the user who started the recording, in
 * ?recorder mode, told which space to join. The egress appends its own url and token to this URL.
 * The pusher names spaces "<world>.<local name>"; the page joins by local name.
 */
export function recorderPageUrl(playUri: string, world: string, spaceName: string, filterType: number): string {
    const url = new URL(playUri);
    url.hash = "";
    url.search = "";
    url.searchParams.set("recorder", "");
    url.searchParams.set("space", spaceName.startsWith(world + ".") ? spaceName.slice(world.length + 1) : spaceName);
    url.searchParams.set("filter", String(filterType));
    return url.toString();
}
