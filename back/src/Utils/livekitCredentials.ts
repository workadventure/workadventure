import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../Enum/EnvironmentVariable";
import { adminApi } from "../Services/AdminApi";
import { getCapability } from "../Services/Capabilities";
import type { LivekitCredentialsResponse } from "../Services/Repository/LivekitCredentialsResponse";


const LIVEKIT_CREDENTIALS_CAPABILITY = "api/livekit/credentials";
const LIVKEIT_CREDENTIALS_VERSION = "v1";

export const getLivekitCredentials = async (playUri: string): Promise<LivekitCredentialsResponse> => {
    if (getCapability(LIVEKIT_CREDENTIALS_CAPABILITY) === LIVKEIT_CREDENTIALS_VERSION) {
        return adminApi.fetchLivekitCredentials(playUri);
    } else {
        if (!LIVEKIT_HOST || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
            throw new Error("Livekit credentials are not set in environment variables");
        }
        return {
            livekitHost: LIVEKIT_HOST,
            livekitApiKey: LIVEKIT_API_KEY,
            livekitApiSecret: LIVEKIT_API_SECRET,
        };
    }
}
