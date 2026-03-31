import type { MatrixClient } from "matrix-js-sdk";
import { encodeUri } from "matrix-js-sdk/lib/utils";
import { Method } from "matrix-js-sdk/lib/http-api/method";
import Debug from "debug";

const debug = Debug("matrix");

/** Log the Synapse cross-user `account_data` explanation at most once per page load. */
let loggedCrossUserAccountDataForbiddenHint = false;

/**
 * Custom account data: last WorkAdventure player name, used with getColorByString for chat avatar/tint color.
 *
 * **Own user:** `client.getAccountData` / sync includes these events for the logged-in user only.
 *
 * **Other users:** Matrix does not replicate arbitrary `account_data` to other clients over `/sync`.
 * To let peers read WorkAdventure fields, the homeserver must allow
 * `GET /_matrix/client/v3/user/{userId}/account_data/{type}` for `userId !==` caller (Synapse stock returns `M_FORBIDDEN`).
 * The client attempts that for {@link WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE} in {@link fetchWaAvatarMxcFromUserAccountDataRemote}
 * and {@link WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE} in {@link fetchWaDisplayNameFromUserAccountDataRemote}.
 */
export const WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE = "fr.workadventure.wa_display_name";

export type WorkAdventureWaDisplayNameAccountData = {
    name: string;
};

export function readWaDisplayNameFromMatrixAccountData(client: MatrixClient): string | undefined {
    const ev = client.getAccountData(WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE);
    const content = ev?.getContent();
    const name = content?.name?.trim();
    return name || undefined;
}

export async function writeWaDisplayNameToMatrixAccountData(client: MatrixClient, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
        return;
    }
    await client.setAccountData(WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE, { name: trimmed });
    debug(
        "setAccountData %s for self %s (name length=%d)",
        WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE,
        client.getSafeUserId() ?? "?",
        trimmed.length
    );
}

/**
 * WorkAdventure in-game (WOKA) avatar as MXC URI. Stored separately from the Matrix profile {@link MatrixClient.setAvatarUrl}
 * so users can keep a custom Matrix avatar while still exposing the WOKA image to WorkAdventure chat peers (when the
 * homeserver allows reading this event for other users, or via sync for the current user).
 */
export const WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE = "fr.workadventure.wa_avatar";

export type WorkAdventureWaAvatarAccountData = {
    mxc_uri: string;
};

export function readWaAvatarMxcFromMatrixAccountData(client: MatrixClient): string | undefined {
    const ev = client.getAccountData(WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE);
    const content = ev?.getContent();
    if (!content || typeof content !== "object") {
        return undefined;
    }
    const record = content as Record<string, unknown>;
    const mxcRaw = record.mxc_uri;
    const mxc = typeof mxcRaw === "string" ? mxcRaw.trim() : undefined;
    if (mxc?.startsWith("mxc://")) {
        return mxc;
    }
    return undefined;
}

export async function writeWaAvatarToMatrixAccountData(client: MatrixClient, mxcUri: string): Promise<void> {
    const trimmed = mxcUri.trim();
    if (!trimmed.startsWith("mxc://")) {
        return;
    }
    await client.setAccountData(WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE, { mxc_uri: trimmed });
    debug(
        "setAccountData %s for self %s mxc=%s",
        WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE,
        client.getSafeUserId() ?? "?",
        trimmed
    );
}

/** Removes WorkAdventure WOKA avatar from Matrix account_data (chat peers no longer see an MXC). */
export async function deleteWaAvatarFromMatrixAccountData(client: MatrixClient): Promise<void> {
    await client.deleteAccountData(WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE);
    debug("deleteAccountData %s for self %s", WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE, client.getSafeUserId() ?? "?");
}

/**
 * Tries to load another user's WA avatar account data from the homeserver.
 * Standard Synapse only allows account_data for the logged-in user; WorkAdventure may expose this for peers.
 */
export async function fetchWaAvatarMxcFromUserAccountDataRemote(
    client: MatrixClient,
    userId: string
): Promise<string | undefined> {
    const path = encodeUri("/user/$userId/account_data/$type", {
        $userId: userId,
        $type: WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE,
    });
    debug(
        "GET peer account_data (caller=%s) path=%s type=%s",
        client.getSafeUserId() ?? "?",
        path,
        WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE
    );
    try {
        const data = await client.http.authedRequest(Method.Get, path);
        if (!data || typeof data !== "object") {
            debug("GET peer wa_avatar: empty or non-object body for userId=%s", userId);
            return undefined;
        }
        const record = data as Record<string, unknown>;
        const mxcRaw = record.mxc_uri;
        const mxc = typeof mxcRaw === "string" ? mxcRaw.trim() : undefined;
        if (mxc?.startsWith("mxc://")) {
            debug("GET peer wa_avatar OK userId=%s mxc=%s (homeserver allows cross-user account_data read)", userId, mxc);
            return mxc;
        }
        debug("GET peer wa_avatar: no mxc_uri in body for userId=%s body=%o", userId, data);
    } catch (e: unknown) {
        const err = e as { data?: { errcode?: string; error?: string }; httpStatus?: number };
        const errcode = err?.data?.errcode;
        const httpStatus = err?.httpStatus;
        if (errcode === "M_NOT_FOUND" || httpStatus === 404) {
            debug("GET peer wa_avatar: no data (404) userId=%s", userId);
            return undefined;
        }
        if (errcode === "M_FORBIDDEN" || httpStatus === 403) {
            if (!loggedCrossUserAccountDataForbiddenHint) {
                loggedCrossUserAccountDataForbiddenHint = true;
                debug(
                    "GET peer account_data: homeserver returned 403 M_FORBIDDEN — this is normal on stock Synapse. " +
                        "Only your own account_data is readable via the client API; other users' events are not replicated in /sync. " +
                        "WorkAdventure chat still uses Matrix profile + in-world WOKA for peer avatars. " +
                        "To let peers read fr.workadventure.wa_avatar via GET /user/{userId}/account_data/..., the Matrix server must explicitly allow that (custom module / policy)."
                );
            }
            debug("GET peer wa_avatar: skipped (403) userId=%s", userId);
            return undefined;
        }
        debug("GET peer wa_avatar unexpected error userId=%s errcode=%s httpStatus=%s %o", userId, errcode ?? "?", httpStatus ?? "?", e);
    }
    return undefined;
}

/**
 * Tries to load another user's WA display name from account_data (for chat tint color).
 * Same homeserver policy as {@link fetchWaAvatarMxcFromUserAccountDataRemote}.
 */
export async function fetchWaDisplayNameFromUserAccountDataRemote(
    client: MatrixClient,
    userId: string
): Promise<string | undefined> {
    const path = encodeUri("/user/$userId/account_data/$type", {
        $userId: userId,
        $type: WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE,
    });
    debug("GET peer account_data wa_display_name path=%s userId=%s", path, userId);
    try {
        const data = await client.http.authedRequest(Method.Get, path);
        if (!data || typeof data !== "object") {
            return undefined;
        }
        const record = data as Record<string, unknown>;
        const nameRaw = record.name;
        const name = typeof nameRaw === "string" ? nameRaw.trim() : undefined;
        if (name) {
            debug("GET peer wa_display_name OK userId=%s", userId);
            return name;
        }
    } catch (e: unknown) {
        const err = e as { data?: { errcode?: string; error?: string }; httpStatus?: number };
        const errcode = err?.data?.errcode;
        const httpStatus = err?.httpStatus;
        if (errcode === "M_NOT_FOUND" || httpStatus === 404) {
            return undefined;
        }
        if (errcode === "M_FORBIDDEN" || httpStatus === 403) {
            debug("GET peer wa_display_name: skipped (403) userId=%s", userId);
            return undefined;
        }
        debug("GET peer wa_display_name unexpected error userId=%s %o", userId, e);
    }
    return undefined;
}
