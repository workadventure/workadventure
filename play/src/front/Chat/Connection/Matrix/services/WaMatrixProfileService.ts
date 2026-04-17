/**
 * WorkAdventure Matrix profile: sync in-game name and WOKA to the Matrix global profile (`/profile`),
 * and resolve avatar URL / chat tint from that profile (with in-world WOKA fallback).
 */
import type { MatrixClient } from "matrix-js-sdk";
import * as Sentry from "@sentry/svelte";
import { defaultWoka } from "@workadventure/shared-utils";
import { get } from "svelte/store";
import Debug from "debug";
import { getColorByString } from "../../../../Utils/ColorGenerator";
import { localUserStore } from "../../../../Connection/LocalUserStore";
import type { UserProviderMerger } from "../../../UserProviderMerger/UserProviderMerger";

const debug = Debug("matrix");

let syncChain: Promise<unknown> = Promise.resolve();

export type SyncWokaAvatarToMatrixResult = "synced" | "unchanged" | "skipped_no_woka" | "skipped_guest" | "failed";

export function syncWokaAvatarToMatrixProfileOnWokaChange(
    client: MatrixClient,
    wokaImageSrc: string | undefined
): Promise<SyncWokaAvatarToMatrixResult> {
    const next = syncChain.then(() => runSyncWokaAvatarToMatrixGlobalProfile(client, wokaImageSrc));
    syncChain = next.catch(() => undefined);
    return next;
}

async function runSyncWokaAvatarToMatrixGlobalProfile(
    client: MatrixClient,
    wokaImageSrc: string | undefined
): Promise<SyncWokaAvatarToMatrixResult> {
    if (client.isGuest()) {
        debug("sync WOKA→Matrix profile skipped: guest");
        return "skipped_guest";
    }

    const userId = client.getSafeUserId();
    if (!userId) {
        debug("sync WOKA→Matrix profile skipped: no user id");
        return "skipped_no_woka";
    }

    if (!wokaImageSrc || wokaImageSrc === defaultWoka) {
        debug("sync WOKA→Matrix profile skipped: no custom WOKA userId=%s", userId);
        return "skipped_no_woka";
    }

    try {
        const matrixProfile = await client.getProfileInfo(userId);
        const blob = await fetchWokaImageAsBlob(client, wokaImageSrc);
        if (!blob || blob.size === 0) {
            return "skipped_no_woka";
        }

        if (matrixProfile?.avatar_url != undefined && matrixProfile.avatar_url != "") {
            const hashNewWoka = await sha256HexOfBlob(blob);
            const blobOldWoka = await fetchWokaImageAsBlob(client, matrixProfile.avatar_url);
            if (blobOldWoka) {
                const hashOldWoka = await sha256HexOfBlob(blobOldWoka);
                if (hashNewWoka === hashOldWoka) {
                    debug("Matrix sync WOKA→Matrix profile skipped: avatar already set userId=%s", userId);
                    return "unchanged";
                }
            }
        }

        const mime = blob.type && blob.type !== "application/octet-stream" ? blob.type : "image/png";
        const upload = await client.uploadContent(blob, { type: mime, name: "avatar.png" });

        await client.setAvatarUrl(upload.content_uri);
        debug("sync WOKA→Matrix profile avatar set userId=%s content_uri=%s", userId, upload.content_uri);
        return "synced";
    } catch (error) {
        debug("sync WOKA→Matrix profile failed userId=%s %o", userId, error);
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

/**
 * Fetch image bytes for hashing or upload. Supports http(s), data:, and Matrix mxc:
 * (resolved via the client's homeserver media endpoint — raw fetch cannot use mxc:).
 */
async function fetchWokaImageAsBlob(client: MatrixClient, src: string): Promise<Blob | undefined> {
    try {
        const url = matrixOrPlainUrlToHttp(client, src);
        if (!url) {
            return undefined;
        }
        const response = await fetch(url);
        return response.ok ? response.blob() : undefined;
    } catch {
        return undefined;
    }
}

function matrixOrPlainUrlToHttp(client: MatrixClient, src: string): string | undefined {
    if (src.startsWith("mxc:")) {
        return client.mxcUrlToHttp(src) ?? undefined;
    }
    return src;
}

/**
 * Sets the Matrix user profile display name and avatar from the in-game name and WOKA image
 * (visible to other users and standard Matrix clients).
 */
export async function pushLocalWokaAndNameToMatrixProfile(
    client: MatrixClient,
    options: { localDisplayName: string | undefined; wokaImageSrc: string | undefined; forceSync: boolean }
): Promise<void> {
    if (client.isGuest()) {
        return;
    }
    const userId = client.getSafeUserId();
    if (!userId) {
        return;
    }

    const matrixProfile = await client.getProfileInfo(userId);
    const name = options.localDisplayName?.trim();
    if ((name && name !== matrixProfile?.displayname?.trim()) || (name && options.forceSync)) {
        try {
            await client.setDisplayName(name);
            debug("Matrix global profile: display name set userId=%s", userId);
        } catch (error) {
            console.warn("pushLocalWokaAndNameToMatrixProfile: setDisplayName failed", error);
            Sentry.captureException(error);
        }
    }

    const wokaSrc = options.wokaImageSrc;
    if (!wokaSrc) {
        debug("Matrix global profile: avatar skipped (no custom WOKA) userId=%s", userId);
        return;
    }
    try {
        const blob = await fetchWokaImageAsBlob(client, wokaSrc);
        if (!blob || blob.size === 0) {
            debug("Matrix global profile: avatar skipped (empty blob) userId=%s", userId);
            return;
        }
        if (matrixProfile?.avatar_url != undefined && matrixProfile.avatar_url != "") {
            const hashNewWoka = await sha256HexOfBlob(blob);

            const blobOldWoka = await fetchWokaImageAsBlob(client, matrixProfile.avatar_url);
            if (blobOldWoka) {
                const hashOldWoka = await sha256HexOfBlob(blobOldWoka);
                if (hashNewWoka === hashOldWoka && !options.forceSync) {
                    debug("Matrix sync WOKA→Matrix profile skipped: avatar already set userId=%s", userId);
                    return;
                }
            }
        }

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

// ─── Chat UI: WOKA fallback + avatar / tint from Matrix profile ─────────────

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

    if (merger) {
        return getWokaPictureUrlFromUserProviderMerger(matrixUserId, merger);
    }

    return undefined;
}

function chatTintFromDisplayName(name: string | undefined): string | undefined {
    const t = name?.trim();
    return t ? getColorByString(t) ?? undefined : undefined;
}

function matrixProfileDisplayNameForTint(
    matrixClient: MatrixClient | undefined,
    matrixUserId: string
): string | undefined {
    const dn = matrixClient?.getUser(matrixUserId)?.displayName?.trim();
    return dn || undefined;
}

export function resolveChatUserColor(
    matrixUserId: string,
    colorFromMerger: string | undefined,
    matrixClient?: MatrixClient
): string | undefined {
    const myId = localUserStore.getChatId();
    if (myId && matrixUserId === myId) {
        const selfTint = chatTintFromDisplayName(
            localUserStore.getDisplayNameForMatrixProfile() ||
                matrixProfileDisplayNameForTint(matrixClient, matrixUserId)
        );
        if (selfTint) {
            return selfTint;
        }
    } else {
        const peerTint = chatTintFromDisplayName(matrixProfileDisplayNameForTint(matrixClient, matrixUserId));
        if (peerTint) {
            return peerTint;
        }
    }
    return colorFromMerger;
}
