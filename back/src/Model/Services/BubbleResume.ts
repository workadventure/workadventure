import { PLAY_URL } from "../../Enum/EnvironmentVariable";
import { LiveKitService } from "./LivekitService";
import { LivekitAvailabilityService } from "./LivekitAvailabilityService";
import { isWithinBackRestartWindow } from "./BackRestartWindow";
import { getLivekitCredentials } from "./LivekitCredentials";

export interface BubbleResumeRequest {
    // The bubble's space name, as the back named it (Group.spaceName)
    spaceName: string;
    world: string;
    spaceUserId: string;
    playUri: string;
}

/**
 * Whether a user reconnecting after a back restart may bring its former bubble back under the same space name.
 * The name comes from the client: it must not let anyone into a conversation they were not part of.
 */
export type BubbleResumeValidator = (request: BubbleResumeRequest) => Promise<boolean>;

const LIVEKIT_CHECK_TIMEOUT_MS = 2_000;

export const canResumeBubbleAfterRestart: BubbleResumeValidator = async ({
    spaceName,
    world,
    spaceUserId,
    playUri,
}) => {
    if (!isWithinBackRestartWindow()) {
        return false;
    }
    let livekitAvailable: boolean;
    try {
        livekitAvailable = new LivekitAvailabilityService().isAvailable();
    } catch {
        // Capabilities not fetched from the admin yet
        livekitAvailable = false;
    }
    // Without LiveKit a bubble is P2P, and the back only ever connects the members it groups: the name alone gives
    // nothing away.
    if (!livekitAvailable) {
        return true;
    }
    // The pusher prefixes space names with the world; LiveKit rooms are named after the back's spaces.
    const livekitSpaceName = `${world}.${spaceName}`;
    const credentials = await getLivekitCredentials(livekitSpaceName, playUri);
    if (!credentials) {
        // No LiveKit server for this room: its bubbles are P2P, as above
        return true;
    }
    const service = new LiveKitService(
        credentials.livekitHost,
        credentials.livekitApiKey,
        credentials.livekitApiSecret,
        credentials.livekitHost.replace("http", "ws"),
        PLAY_URL,
    );
    const identities = await Promise.race([
        service.participantIdentities(livekitSpaceName),
        new Promise<undefined>((resolve) => {
            setTimeout(() => resolve(undefined), LIVEKIT_CHECK_TIMEOUT_MS);
        }),
    ]);
    if (identities === undefined) {
        return false;
    }
    // An empty room (a P2P bubble, or nobody left): nothing to overhear. Otherwise only one of its participants, still
    // connected to it, may bring it back (the LiveKit identity is the spaceUserId).
    return identities.length === 0 || identities.includes(spaceUserId);
};
