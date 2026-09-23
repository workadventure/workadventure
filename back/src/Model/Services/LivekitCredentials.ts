import { getCapability } from "../../Services/Capabilities";
import { adminApi } from "../../Services/AdminApi";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../../Enum/EnvironmentVariable";
import type { LivekitCredentialsResponse } from "../../Services/Repository/LivekitCredentialsResponse";

const LIVEKIT_CREDENTIALS_CAPABILITY = "api/livekit/credentials";
const LIVEKIT_CREDENTIALS_VERSION = "v1";

/**
 * The LiveKit server a space uses: the admin's (per space) when it provides them, the environment's otherwise.
 */
export async function getLivekitCredentials(spaceName: string, playUri?: string): Promise<LivekitCredentialsResponse> {
    if (getCapability(LIVEKIT_CREDENTIALS_CAPABILITY) === LIVEKIT_CREDENTIALS_VERSION) {
        if (!playUri) {
            throw new Error("playUri is required when using AdminAPI for Livekit credentials");
        }
        return adminApi.fetchLivekitCredentials(spaceName, playUri);
    }
    if (!LIVEKIT_HOST || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        throw new Error("Livekit credentials are not set in environment variables");
    }
    return {
        livekitHost: LIVEKIT_HOST,
        livekitApiKey: LIVEKIT_API_KEY,
        livekitApiSecret: LIVEKIT_API_SECRET,
    };
}
