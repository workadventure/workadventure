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
