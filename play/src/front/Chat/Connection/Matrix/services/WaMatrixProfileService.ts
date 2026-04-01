/**
 * WorkAdventure Matrix profile: `account_data` API, WOKA → MXC sync, chat caches, avatar URL / tint resolution.
 */
import type { MatrixClient } from "matrix-js-sdk";
import { encodeUri } from "matrix-js-sdk/lib/utils";
import { Method } from "matrix-js-sdk/lib/http-api/method";
import * as Sentry from "@sentry/svelte";
import { defaultWoka } from "@workadventure/shared-utils";
import { get, writable } from "svelte/store";
import Debug from "debug";
import { getColorByString } from "../../../../Utils/ColorGenerator";
import { localUserStore } from "../../../../Connection/LocalUserStore";
import type { UserProviderMerger } from "../../../UserProviderMerger/UserProviderMerger";

const debug = Debug("matrix");

// ─── Types / constants (Matrix account_data event types) ───────────────────────

export const WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE = "fr.workadventure.wa_display_name";
export const WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE = "fr.workadventure.wa_avatar";

export type WorkAdventureWaDisplayNameAccountData = { name: string };
export type WorkAdventureWaAvatarAccountData = { mxc_uri: string };

// ─── account_data: local (synced) read / write ───────────────────────────────

export function readWaDisplayNameFromMatrixAccountData(client: MatrixClient): string | undefined {
    const ev = client.getAccountData(WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE);
    const name = ev?.getContent()?.name?.trim();
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

function parseMxcUriField(record: Record<string, unknown>): string | undefined {
    const raw = record.mxc_uri;
    const mxc = typeof raw === "string" ? raw.trim() : undefined;
    return mxc?.startsWith("mxc://") ? mxc : undefined;
}

export function readWaAvatarMxcFromMatrixAccountData(client: MatrixClient): string | undefined {
    const content = client.getAccountData(WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE)?.getContent();
    if (!content || typeof content !== "object") {
        return undefined;
    }
    return parseMxcUriField(content as Record<string, unknown>);
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

export async function deleteWaAvatarFromMatrixAccountData(client: MatrixClient): Promise<void> {
    await client.deleteAccountData(WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE);
    debug("deleteAccountData %s for self %s", WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE, client.getSafeUserId() ?? "?");
}

// ─── account_data: peer GET (homeserver may forbid cross-user reads) ─────────

let loggedCrossUserAccountDataForbiddenHint = false;

type MatrixHttpErr = { data?: { errcode?: string; error?: string }; httpStatus?: number };

async function getPeerAccountDataRecord(
    client: MatrixClient,
    userId: string,
    accountDataType: string,
    label: string
): Promise<Record<string, unknown> | undefined> {
    const path = encodeUri("/user/$userId/account_data/$type", {
        $userId: userId,
        $type: accountDataType,
    });
    debug("GET peer account_data %s path=%s userId=%s", label, path, userId);
    try {
        const data = await client.http.authedRequest(Method.Get, path);
        if (!data || typeof data !== "object") {
            if (label === "wa_avatar") {
                debug("GET peer wa_avatar: empty or non-object body for userId=%s", userId);
            }
            return undefined;
        }
        return data as Record<string, unknown>;
    } catch (e: unknown) {
        const err = e as MatrixHttpErr;
        const errcode = err?.data?.errcode;
        const httpStatus = err?.httpStatus;
        if (errcode === "M_NOT_FOUND" || httpStatus === 404) {
            debug("GET peer %s: no data (404) userId=%s", label, userId);
            return undefined;
        }
        if (errcode === "M_FORBIDDEN" || httpStatus === 403) {
            if (
                accountDataType === WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE &&
                !loggedCrossUserAccountDataForbiddenHint
            ) {
                loggedCrossUserAccountDataForbiddenHint = true;
                debug(
                    "GET peer account_data: homeserver returned 403 M_FORBIDDEN — normal on stock Synapse; " +
                        "cross-user WA fields need server support. Chat falls back to Matrix profile + in-world WOKA."
                );
            }
            debug("GET peer %s: skipped (403) userId=%s", label, userId);
            return undefined;
        }
        debug(
            "GET peer %s unexpected userId=%s errcode=%s httpStatus=%s %o",
            label,
            userId,
            errcode ?? "?",
            httpStatus ?? "?",
            e
        );
        return undefined;
    }
}

export async function fetchWaAvatarMxcFromUserAccountDataRemote(
    client: MatrixClient,
    userId: string
): Promise<string | undefined> {
    debug(
        "GET peer account_data (caller=%s) type=%s userId=%s",
        client.getSafeUserId() ?? "?",
        WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE,
        userId
    );
    const record = await getPeerAccountDataRecord(
        client,
        userId,
        WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE,
        "wa_avatar"
    );
    if (!record) {
        return undefined;
    }
    const mxc = parseMxcUriField(record);
    if (mxc) {
        debug("GET peer wa_avatar OK userId=%s mxc=%s", userId, mxc);
        return mxc;
    }
    debug("GET peer wa_avatar: no mxc_uri in body for userId=%s body=%o", userId, record);
    return undefined;
}

export async function fetchWaDisplayNameFromUserAccountDataRemote(
    client: MatrixClient,
    userId: string
): Promise<string | undefined> {
    const record = await getPeerAccountDataRecord(
        client,
        userId,
        WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE,
        "wa_display_name"
    );
    if (!record) {
        return undefined;
    }
    const nameRaw = record.name;
    const name = typeof nameRaw === "string" ? nameRaw.trim() : undefined;
    if (name) {
        debug("GET peer wa_display_name OK userId=%s", userId);
        return name;
    }
    return undefined;
}

// ─── WOKA image → Matrix content repo → account_data ─────────────────────────

export type SyncWokaAvatarToMatrixResult = "synced" | "unchanged" | "skipped_no_woka" | "skipped_guest" | "failed";

let syncChain: Promise<unknown> = Promise.resolve();
const lastSyncedWokaAvatarContentHashByMatrixUserId = new Map<string, string>();

export function clearLastSyncedWokaAvatarHashForMatrixUser(matrixUserId: string): void {
    lastSyncedWokaAvatarContentHashByMatrixUserId.delete(matrixUserId);
}

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
        if (lastSyncedWokaAvatarContentHashByMatrixUserId.get(userId) === hash) {
            debug("sync WOKA→account_data unchanged (hash) userId=%s", userId);
            return "unchanged";
        }

        const mime = blob.type && blob.type !== "application/octet-stream" ? blob.type : "image/png";
        const upload = await client.uploadContent(blob, { type: mime, name: "avatar.png" });

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
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

async function fetchWokaImageAsBlob(src: string): Promise<Blob | undefined> {
    try {
        const response = await fetch(src);
        return response.ok ? response.blob() : undefined;
    } catch {
        return undefined;
    }
}

// ─── Matrix global profile (`/profile`) from in-game name + WOKA ─────────────

/**
 * Sets the Matrix user profile display name and avatar from the in-game name and WOKA image
 * (visible in standard Matrix clients). Distinct from WorkAdventure `account_data` sync.
 */
export async function pushLocalWokaAndNameToMatrixProfile(
    client: MatrixClient,
    options: { localDisplayName: string | undefined; wokaImageSrc: string | undefined }
): Promise<void> {
    if (client.isGuest()) {
        return;
    }
    const userId = client.getSafeUserId();
    if (!userId) {
        return;
    }

    const name = options.localDisplayName?.trim();
    if (name) {
        try {
            await client.setDisplayName(name);
            debug("Matrix global profile: display name set userId=%s", userId);
        } catch (error) {
            console.warn("pushLocalWokaAndNameToMatrixProfile: setDisplayName failed", error);
            Sentry.captureException(error);
            throw error;
        }
    }

    const wokaSrc = options.wokaImageSrc;
    if (!wokaSrc || wokaSrc === defaultWoka) {
        debug("Matrix global profile: avatar skipped (no custom WOKA) userId=%s", userId);
        return;
    }

    try {
        const blob = await fetchWokaImageAsBlob(wokaSrc);
        if (!blob || blob.size === 0) {
            debug("Matrix global profile: avatar skipped (empty blob) userId=%s", userId);
            return;
        }
        const mime = blob.type && blob.type !== "application/octet-stream" ? blob.type : "image/png";
        const upload = await client.uploadContent(blob, { type: mime, name: "avatar.png" });
        await client.setAvatarUrl(upload.content_uri);
        debug("Matrix global profile: avatar set userId=%s mxc=%s", userId, upload.content_uri);
    } catch (error) {
        console.warn("pushLocalWokaAndNameToMatrixProfile: setAvatarUrl failed", error);
        Sentry.captureException(error);
        throw error;
    }
}

// ─── Chat UI: session caches + avatar / tint ─────────────────────────────────

export function getWokaPictureUrlFromUserProviderMerger(
    matrixUserId: string,
    merger: UserProviderMerger
): string | undefined {
    for (const [, { users }] of get(merger.usersByRoomStore)) {
        const user = users.find((u) => u.chatId === matrixUserId);
        const url = user?.pictureStore ? get(user.pictureStore) : undefined;
        if (url) {
            return url;
        }
    }
    return undefined;
}

const waAvatarAccountDataHttpByUserId = new Map<string, string>();

export function setWaAvatarAccountDataHttpCacheForUser(matrixUserId: string, httpUrl: string): void {
    waAvatarAccountDataHttpByUserId.set(matrixUserId, httpUrl);
    debug("avatar URL cache set from peer account_data mxc→http userId=%s", matrixUserId);
}

export function clearWaAvatarHttpCachesForUser(matrixUserId: string): void {
    waAvatarAccountDataHttpByUserId.delete(matrixUserId);
}

const waDisplayNameFromAccountDataByUserId = new Map<string, string>();

export const peerWaAccountDataColorTick = writable(0);

function bumpPeerWaTintTick(): void {
    peerWaAccountDataColorTick.update((n) => n + 1);
}

export function setWaDisplayNameAccountDataCacheForUser(matrixUserId: string, name: string): void {
    const trimmed = name.trim();
    const prev = waDisplayNameFromAccountDataByUserId.get(matrixUserId);
    if (!trimmed) {
        if (prev === undefined) {
            return;
        }
        waDisplayNameFromAccountDataByUserId.delete(matrixUserId);
        bumpPeerWaTintTick();
        return;
    }
    if (prev === trimmed) {
        return;
    }
    waDisplayNameFromAccountDataByUserId.set(matrixUserId, trimmed);
    bumpPeerWaTintTick();
}

function getWaDisplayNameFromAccountDataSessionCache(matrixUserId: string): string | undefined {
    return waDisplayNameFromAccountDataByUserId.get(matrixUserId);
}

function avatarHttp96(client: MatrixClient, mxc: string | null | undefined): string | undefined {
    if (!mxc) {
        return undefined;
    }
    return client.mxcUrlToHttp(mxc, 96, 96) ?? undefined;
}

export function resolveDirectMessagePeerAvatarUrl(
    matrixUserId: string,
    roomMemberHttpAvatar: string | null | undefined,
    matrixClient: MatrixClient,
    merger: UserProviderMerger | undefined
): string | undefined {
    if (roomMemberHttpAvatar) {
        return roomMemberHttpAvatar;
    }

    const profileHttp = avatarHttp96(matrixClient, matrixClient.getUser(matrixUserId)?.avatarUrl);
    if (profileHttp) {
        return profileHttp;
    }

    const myChatId = localUserStore.getChatId();
    if (myChatId && matrixUserId === myChatId) {
        const ownWa = avatarHttp96(matrixClient, readWaAvatarMxcFromMatrixAccountData(matrixClient));
        if (ownWa) {
            return ownWa;
        }
    }

    const cachedPeer = waAvatarAccountDataHttpByUserId.get(matrixUserId);
    if (cachedPeer) {
        return cachedPeer;
    }

    if (merger) {
        return getWokaPictureUrlFromUserProviderMerger(matrixUserId, merger);
    }

    return undefined;
}

function chatTintFromWaDisplayName(name: string | undefined): string | undefined {
    const t = name?.trim();
    return t ? getColorByString(t) ?? undefined : undefined;
}

export function resolveChatUserColor(
    matrixUserId: string,
    colorFromMerger: string | undefined,
    matrixClient?: MatrixClient
): string | undefined {
    const myId = localUserStore.getChatId();
    if (myId && matrixUserId === myId) {
        const selfTint = chatTintFromWaDisplayName(
            localUserStore.getName()?.trim() ||
                (matrixClient ? readWaDisplayNameFromMatrixAccountData(matrixClient) : undefined)
        );
        if (selfTint) {
            return selfTint;
        }
    }
    const peerTint = chatTintFromWaDisplayName(getWaDisplayNameFromAccountDataSessionCache(matrixUserId));
    if (peerTint) {
        return peerTint;
    }
    return colorFromMerger;
}
