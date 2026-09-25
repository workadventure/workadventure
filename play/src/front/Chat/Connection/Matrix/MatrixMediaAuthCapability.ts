/**
 * Detects whether the Matrix homeserver supports authenticated media
 * (MSC3916, stabilised in the Matrix client-server spec v1.11).
 *
 * When a homeserver enforces authenticated media, the legacy unauthenticated
 * endpoints (`/_matrix/media/v3/...`) answer with 401/404, so media URLs must
 * be switched to the authenticated endpoints (`/_matrix/client/v1/media/...`)
 * which require an `Authorization: Bearer` header. Older homeservers do not
 * expose those endpoints, so switching blindly would break media there.
 *
 * The detection therefore gates the whole feature: it defaults to `false`
 * (legacy behaviour, byte-for-byte identical to before) on any uncertainty.
 */
import type { MatrixClient } from "matrix-js-sdk";
import Debug from "debug";

const debug = Debug("matrix-media-auth");

const UNSTABLE_AUTHENTICATED_MEDIA_FEATURE = "org.matrix.msc3916.stable";

type ServerVersions = Awaited<ReturnType<MatrixClient["getVersions"]>>;

const resultByClient = new WeakMap<MatrixClient, boolean>();
const inflightByClient = new WeakMap<MatrixClient, Promise<boolean>>();

/**
 * Returns whether the homeserver supports authenticated media.
 *
 * The result is memoised per client. Failures are NOT cached (they resolve to
 * `false` but allow a later retry), so a transient error at startup does not
 * disable authenticated media for the whole session on a server that supports
 * it.
 */
export function serverSupportsAuthenticatedMedia(client: MatrixClient): Promise<boolean> {
    const cached = resultByClient.get(client);
    if (cached !== undefined) {
        return Promise.resolve(cached);
    }
    const inflight = inflightByClient.get(client);
    if (inflight) {
        return inflight;
    }

    const detection = detectAuthenticatedMediaSupport(client)
        .then((supported) => {
            resultByClient.set(client, supported);
            return supported;
        })
        .catch((error) => {
            debug("authenticated media detection failed, falling back to legacy media: %o", error);
            return false;
        })
        .finally(() => {
            inflightByClient.delete(client);
        });

    inflightByClient.set(client, detection);
    return detection;
}

async function detectAuthenticatedMediaSupport(client: MatrixClient): Promise<boolean> {
    const versions: ServerVersions = await client.getVersions();
    if (!versions) {
        return false;
    }

    const specVersions = versions.versions ?? [];
    if (specVersions.some(isSpecVersionAtLeastV1_11)) {
        return true;
    }

    return versions.unstable_features?.[UNSTABLE_AUTHENTICATED_MEDIA_FEATURE] === true;
}

/**
 * Matrix spec versions look like `r0.6.1` (pre-1.0) or `v1.11`. Authenticated
 * media is only guaranteed from `v1.11` onwards, so only the `v{major}.{minor}`
 * scheme is considered and compared numerically.
 */
export function isSpecVersionAtLeastV1_11(version: string): boolean {
    const match = /^v(\d+)\.(\d+)$/.exec(version);
    if (!match) {
        return false;
    }
    const major = Number(match[1]);
    const minor = Number(match[2]);
    return major > 1 || (major === 1 && minor >= 11);
}
