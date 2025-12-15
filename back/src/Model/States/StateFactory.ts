import type { SpaceUser } from "@workadventure/messages";
import { getCapability } from "../../Services/Capabilities";
import { adminApi } from "../../Services/AdminApi";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../../Enum/EnvironmentVariable";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { LivekitState } from "./LivekitState";

export async function createLivekitState(
    space: ICommunicationSpace,
    playUri: string,
    users: ReadonlyMap<string, SpaceUser>,
    usersToNotify: ReadonlyMap<string, SpaceUser>
): Promise<LivekitState> {
    if (getCapability("api/livekit/credentials") === "v1") {
        const credentials = await adminApi.fetchLivekitCredentials(space.getSpaceName(), playUri);
        return new LivekitState(space, credentials, users, usersToNotify);
    } else {
        if (!LIVEKIT_HOST || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
            throw new Error("Livekit credentials are not set in environment variables");
        }
        return new LivekitState(
            space,
            {
                livekitHost: LIVEKIT_HOST,
                livekitApiKey: LIVEKIT_API_KEY,
                livekitApiSecret: LIVEKIT_API_SECRET,
            },
            users,
            usersToNotify
        ); //fallback to default credentials
    }
}
