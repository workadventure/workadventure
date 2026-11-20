import { randomUUID } from "crypto";
import { AccessToken, TokenVerifier } from "livekit-server-sdk";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../Enum/EnvironmentVariable";

/**
 * The ?recorder page is the LiveKit egress filming the map: the egress hands it a LiveKit token with the "recorder"
 * grant. Only that token makes a connection invisible, so nobody can hide in a room without our LiveKit secret.
 * Throws if the token is not a valid recorder token.
 */
export async function verifyRecorderToken(token: string): Promise<{ follow: string | undefined }> {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        throw new Error("Recorder connection refused: LiveKit is not configured");
    }
    const claims = await new TokenVerifier(LIVEKIT_API_KEY, LIVEKIT_API_SECRET).verify(token);
    if (claims.video?.recorder !== true) {
        throw new Error("Recorder connection refused: the token has no recorder grant");
    }
    // Tokens we mint for a web egress name the user to follow; the ones a RoomComposite egress hands out do not.
    return { follow: claims.metadata || undefined };
}

/**
 * The token a web egress's page presents to be let in as a recorder, following the user `follow` (their uuid)
 * from bubble to bubble. Signed with our LiveKit secret, so the person to follow cannot be changed in the URL.
 */
export async function mintRecorderToken(follow: string): Promise<string> {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        throw new Error("LiveKit is not configured");
    }
    // ponytail: the page re-presents this token when its socket reconnects, hence a full day; scope it to the
    // recording session if reconnection after a day matters.
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: `recorder-${randomUUID()}`,
        metadata: follow,
        ttl: "24h",
    });
    token.addGrant({ recorder: true, hidden: true });
    return token.toJwt();
}

/**
 * The page the egress opens to film a space over the map: the map of the user who started the recording, in
 * ?recorder mode, told which space to join. The egress appends its own url and token to this URL.
 * The pusher names spaces "<world>.<local name>"; the page joins by local name.
 */
export function recorderPageUrl(
    playUri: string,
    layout: string,
    world: string,
    spaceName: string,
    filterType: number,
): string {
    const url = recorderMapUrl(playUri, layout);
    url.searchParams.set("space", spaceName.startsWith(world + ".") ? spaceName.slice(world.length + 1) : spaceName);
    url.searchParams.set("filter", String(filterType));
    return url.toString();
}

/**
 * The page a web egress films to follow a user: their map in ?recorder mode, with the recorder token (which names
 * the user to follow). No space: the back sends the page into that user's bubbles.
 */
export function recorderFollowPageUrl(playUri: string, layout: string, token: string): string {
    const url = recorderMapUrl(playUri, layout);
    url.searchParams.set("token", token);
    return url.toString();
}

function recorderMapUrl(playUri: string, layout: string): URL {
    const url = new URL(playUri);
    url.hash = "";
    url.search = "";
    url.searchParams.set("recorder", "");
    // Not "layout": a room composite egress sets its own ?layout= on the page it films.
    if (layout) url.searchParams.set("recorderLayout", layout);
    return url;
}
