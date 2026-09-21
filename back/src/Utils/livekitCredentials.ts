import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../Enum/EnvironmentVariable";
import { adminApi } from "../Services/AdminApi";
import { getCapability } from "../Services/Capabilities";
import type { LivekitCredentialsResponse } from "../Services/Repository/LivekitCredentialsResponse";

const LIVEKIT_CREDENTIALS_CAPABILITY = "api/livekit/credentials";
const LIVEKIT_CREDENTIALS_VERSION = "v1";

/**
 * Returns true if LiveKit can be used in this deployment, either through the admin API
 * (capability "api/livekit/credentials") or through environment variables.
 * Used to avoid running LiveKit-specific logic (e.g. the connection test) on deployments
 * that rely on WebRTC only and have no LiveKit configured.
 */
export const isLivekitAvailable = (): boolean => {
    if (getCapability(LIVEKIT_CREDENTIALS_CAPABILITY) === LIVEKIT_CREDENTIALS_VERSION) {
        return true;
    }
    return Boolean(LIVEKIT_HOST && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
};

export const getLivekitCredentials = async (playUri?: string): Promise<LivekitCredentialsResponse> => {
    if (getCapability(LIVEKIT_CREDENTIALS_CAPABILITY) === LIVEKIT_CREDENTIALS_VERSION) {
        if (!playUri) {
            throw new Error("playUri is required when using the admin API for LiveKit credentials");
        }
        return adminApi.fetchLivekitCredentials(playUri);
    }

    if (!LIVEKIT_HOST || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        throw new Error("Livekit credentials are not set in environment variables");
    }
    return {
        livekitHost: LIVEKIT_HOST,
        livekitApiKey: LIVEKIT_API_KEY,
        livekitApiSecret: LIVEKIT_API_SECRET,
    };
};
