/**
 * WorkAdventure-specific Matrix profile data: `account_data` CRUD, peer GETs, and WOKA → MXC sync into `fr.workadventure.wa_avatar`.
 */
import type { MatrixClient } from "matrix-js-sdk";
import { encodeUri } from "matrix-js-sdk/lib/utils";
import { Method } from "matrix-js-sdk/lib/http-api/method";
import * as Sentry from "@sentry/svelte";
import { defaultWoka } from "@workadventure/shared-utils";
import Debug from "debug";

const debug = Debug("matrix");

// ─── account_data (Matrix API) ───────────────────────────────────────────────

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
            debug(
                "GET peer wa_avatar OK userId=%s mxc=%s (homeserver allows cross-user account_data read)",
                userId,
                mxc
            );
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
        debug(
            "GET peer wa_avatar unexpected error userId=%s errcode=%s httpStatus=%s %o",
            userId,
            errcode ?? "?",
            httpStatus ?? "?",
            e
        );
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

// ─── WOKA image → Matrix content repo → account_data ─────────────────────────

export type SyncWokaAvatarToMatrixResult = "synced" | "unchanged" | "skipped_no_woka" | "skipped_guest" | "failed";

/** Serialize concurrent syncs (WOKA store can emit quickly). */
let syncChain: Promise<unknown> = Promise.resolve();

/** In-session dedup only (account_data + MXC is the source of truth for WOKA image; no localStorage). */
const lastSyncedWokaAvatarContentHashByMatrixUserId = new Map<string, string>();

/** Call after clearing WA avatar account_data so the next WOKA change can upload again. */
export function clearLastSyncedWokaAvatarHashForMatrixUser(matrixUserId: string): void {
    lastSyncedWokaAvatarContentHashByMatrixUserId.delete(matrixUserId);
}

/**
 * Uploads the in-game WOKA image to the Matrix content repo and stores the MXC URI in WorkAdventure account_data
 * (`fr.workadventure.wa_avatar`) so it does not overwrite the user's Matrix profile avatar.
 */
export function syncWokaAvatarToMatrixProfileOnWokaChange(
    client: MatrixClient,
    wokaImageSrc: string | undefined
): Promise<SyncWokaAvatarToMatrixResult> {
    const next = syncChain.then(() => runSyncWokaAvatarToMatrixProfile(client, wokaImageSrc));
    syncChain = next.catch(() => undefined);
    return next;
}

async function runSyncWokaAvatarToMatrixProfile(
    client: MatrixClient,
    wokaImageSrc: string | undefined
): Promise<SyncWokaAvatarToMatrixResult> {
    if (client.isGuest()) {
        debug("sync WOKA→account_data skipped: guest");
        return "skipped_guest";
    }

    const userId = client.getSafeUserId();
    if (!userId) {
        debug("sync WOKA→account_data skipped: no user id");
        return "skipped_no_woka";
    }

    if (!wokaImageSrc || wokaImageSrc === defaultWoka) {
        debug("sync WOKA→account_data skipped: no custom WOKA userId=%s", userId);
        return "skipped_no_woka";
    }

    try {
        const blob = await fetchWokaImageAsBlob(wokaImageSrc);
        if (!blob || blob.size === 0) {
            return "skipped_no_woka";
        }

        const hash = await sha256HexOfBlob(blob);
        const previous = lastSyncedWokaAvatarContentHashByMatrixUserId.get(userId);
        if (previous === hash) {
            debug("sync WOKA→account_data unchanged (hash) userId=%s", userId);
            return "unchanged";
        }

        const mime = blob.type && blob.type !== "application/octet-stream" ? blob.type : "image/png";
        const upload = await client.uploadContent(blob, {
            type: mime,
            name: "avatar.png",
        });

        await writeWaAvatarToMatrixAccountData(client, upload.content_uri);
        lastSyncedWokaAvatarContentHashByMatrixUserId.set(userId, hash);
        debug("sync WOKA→account_data synced userId=%s content_uri=%s", userId, upload.content_uri);
        return "synced";
    } catch (error) {
        debug("sync WOKA→account_data failed userId=%s %o", userId, error);
        console.warn("syncWokaAvatarToMatrixProfileOnWokaChange failed:", error);
        Sentry.captureException(error);
        return "failed";
    }
}

async function sha256HexOfBlob(blob: Blob): Promise<string> {
    const buf = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchWokaImageAsBlob(src: string): Promise<Blob | undefined> {
    try {
        const response = await fetch(src);
        if (!response.ok) {
            return undefined;
        }
        return response.blob();
    } catch {
        return undefined;
    }
}
