import type { MatrixClient } from "matrix-js-sdk";
import { get, writable } from "svelte/store";
import Debug from "debug";
import { getColorByString } from "../../../Utils/ColorGenerator";
import { localUserStore } from "../../../Connection/LocalUserStore";
import type { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";
import { readWaAvatarMxcFromMatrixAccountData } from "./matrixWaAccountData";

const debug = Debug("matrix");

/**
 * WOKA / in-world user picture from merged user providers (same source as the user list).
 */
export function getWokaPictureUrlFromUserProviderMerger(
    matrixUserId: string,
    merger: UserProviderMerger
): string | undefined {
    const byRoom = get(merger.usersByRoomStore);
    for (const [, { users }] of byRoom) {
        const user = users.find((u) => u.chatId === matrixUserId);
        if (user?.pictureStore) {
            const url = get(user.pictureStore);
            if (url) {
                return url;
            }
        }
    }
    return undefined;
}

/**
 * HTTP URLs from WorkAdventure `fr.workadventure.wa_avatar` account_data (after async fetch for peers).
 * In-session only — not persisted (avoids stale cross-tab / cross-user confusion).
 */
const waAvatarAccountDataHttpByUserId = new Map<string, string>();

export function setWaAvatarAccountDataHttpCacheForUser(matrixUserId: string, httpUrl: string): void {
    waAvatarAccountDataHttpByUserId.set(matrixUserId, httpUrl);
    debug("avatar URL cache set from peer account_data mxc→http userId=%s", matrixUserId);
}

function getWaAvatarAccountDataHttpFromCache(matrixUserId: string): string | undefined {
    return waAvatarAccountDataHttpByUserId.get(matrixUserId);
}

/** Clears in-session HTTP avatar from peer `account_data` for a Matrix user (e.g. after removing profile images). */
export function clearWaAvatarHttpCachesForUser(matrixUserId: string): void {
    waAvatarAccountDataHttpByUserId.delete(matrixUserId);
}

/**
 * `fr.workadventure.wa_display_name` from peer GET (session only), for {@link resolveChatUserColor}.
 * Bumping {@link peerWaAccountDataColorTick} notifies UI when hydration completes.
 */
const waDisplayNameFromAccountDataByUserId = new Map<string, string>();

/** Increment when peer WA display name cache changes so list/message rows recompute tint. */
export const peerWaAccountDataColorTick = writable(0);

export function setWaDisplayNameAccountDataCacheForUser(matrixUserId: string, name: string): void {
    const trimmed = name.trim();
    const prev = waDisplayNameFromAccountDataByUserId.get(matrixUserId);
    if (!trimmed) {
        if (prev === undefined) {
            return;
        }
        waDisplayNameFromAccountDataByUserId.delete(matrixUserId);
        peerWaAccountDataColorTick.update((n) => n + 1);
        return;
    }
    if (prev === trimmed) {
        return;
    }
    waDisplayNameFromAccountDataByUserId.set(matrixUserId, trimmed);
    peerWaAccountDataColorTick.update((n) => n + 1);
}

function getWaDisplayNameFromAccountDataSessionCache(matrixUserId: string): string | undefined {
    return waDisplayNameFromAccountDataByUserId.get(matrixUserId);
}

/**
 * Avatar URL for room members / DM peers.
 * Order: room member avatar → Matrix profile avatar → WorkAdventure account_data WOKA avatar (MXC) → live WOKA from merger.
 */
export function resolveDirectMessagePeerAvatarUrl(
    matrixUserId: string,
    roomMemberHttpAvatar: string | null | undefined,
    matrixClient: MatrixClient,
    merger: UserProviderMerger | undefined
): string | undefined {
    if (roomMemberHttpAvatar) {
        return roomMemberHttpAvatar;
    }

    const matrixUser = matrixClient.getUser(matrixUserId);
    const mxc = matrixUser?.avatarUrl;
    if (mxc) {
        const http = matrixClient.mxcUrlToHttp(mxc, 96, 96);
        if (http) {
            return http;
        }
    }

    const myChatId = localUserStore.getChatId();
    if (myChatId && matrixUserId === myChatId) {
        const waMxc = readWaAvatarMxcFromMatrixAccountData(matrixClient);
        if (waMxc) {
            const http = matrixClient.mxcUrlToHttp(waMxc, 96, 96);
            if (http) {
                return http;
            }
        }
    }

    const cachedWaAccount = getWaAvatarAccountDataHttpFromCache(matrixUserId);
    if (cachedWaAccount) {
        return cachedWaAccount;
    }

    if (merger) {
        const woka = getWokaPictureUrlFromUserProviderMerger(matrixUserId, merger);
        if (woka) {
            return woka;
        }
    }

    return undefined;
}

/**
 * Chat background / avatar tint from WorkAdventure `fr.workadventure.wa_display_name` (own: store from sync;
 * others: session cache filled by GET after {@link fetchWaDisplayNameFromUserAccountDataRemote}), then merger color.
 * Not persisted — avoids stale tints across tabs/users.
 */
export function resolveChatUserColor(
    matrixUserId: string,
    colorFromMerger: string | undefined
): string | undefined {
    const waNamePeer = getWaDisplayNameFromAccountDataSessionCache(matrixUserId);
    if (waNamePeer?.trim()) {
        const fromPeer = getColorByString(waNamePeer);
        if (fromPeer) {
            return fromPeer;
        }
    }
    if (colorFromMerger) {
        return colorFromMerger;
    }
    return undefined;
}
