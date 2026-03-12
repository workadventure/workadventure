import { getCapability } from "../../Services/Capabilities.ts";
import { LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../../Enum/EnvironmentVariable.ts";
import type { LivekitAvailabilityChecker } from "../Interfaces/ITransitionPolicy.ts";

const LIVEKIT_CREDENTIALS_CAPABILITY = "api/livekit/credentials";
const LIVEKIT_CREDENTIALS_VERSION = "v1";

/**
 * Service for checking LiveKit availability.
 * Implements LivekitAvailabilityChecker interface for dependency inversion.
 */
export class LivekitAvailabilityService implements LivekitAvailabilityChecker {
    /**
     * Checks if LiveKit is available either through AdminAPI capabilities
     * or through environment variables.
     */
    isAvailable(): boolean {
        return (
            getCapability(LIVEKIT_CREDENTIALS_CAPABILITY) === LIVEKIT_CREDENTIALS_VERSION ||
            (!!LIVEKIT_HOST && !!LIVEKIT_API_KEY && !!LIVEKIT_API_SECRET)
        );
    }
}
