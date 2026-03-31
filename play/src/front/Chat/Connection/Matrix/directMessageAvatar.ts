import type { MatrixClient } from "matrix-js-sdk";
import { get } from "svelte/store";
import { getColorByString } from "../../../Utils/ColorGenerator";
import { localUserStore } from "../../../Connection/LocalUserStore";
import type { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";
import { matrixWaDisplayNameForColorStore } from "../../Stores/matrixWaDisplayNameForColorStore";

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
 * Avatar URL for room members / DM peers.
 * Prefer Matrix (room member state, then global profile — synced from WOKA in-app) over live WOKA from the merger,
 * so DM rows and timelines match the Matrix profile photo.
 * WOKA from the merger remains a fallback when the profile is not available yet.
 */
export function resolveDirectMessagePeerAvatarUrl(
    matrixUserId: string,
    roomMemberHttpAvatar: string | null | undefined,
    matrixClient: MatrixClient,
    merger: UserProviderMerger | undefined
): string | undefined {
    if (roomMemberHttpAvatar) {
        localUserStore.setDirectMessagePeerAvatarUrlCache(matrixUserId, roomMemberHttpAvatar);
        return roomMemberHttpAvatar;
    }

    const matrixUser = matrixClient.getUser(matrixUserId);
    const mxc = matrixUser?.avatarUrl;
    if (mxc) {
        const http = matrixClient.mxcUrlToHttp(mxc, 96, 96);
        if (http) {
            localUserStore.setDirectMessagePeerAvatarUrlCache(matrixUserId, http);
            return http;
        }
    }

    if (merger) {
        const woka = getWokaPictureUrlFromUserProviderMerger(matrixUserId, merger);
        if (woka) {
            localUserStore.setDirectMessagePeerAvatarUrlCache(matrixUserId, woka);
            return woka;
        }
    }

    return localUserStore.getDirectMessagePeerAvatarUrlCache(matrixUserId);
}

/**
 * Chat background / avatar tint: for the logged-in user, prefer color from the WorkAdventure name in Matrix
 * account_data (see matrixWaAccountData) via matrixWaDisplayNameForColorStore; otherwise merger + cache.
 */
export function resolveChatUserColorWithCache(
    matrixUserId: string,
    colorFromMerger: string | undefined
): string | undefined {
    const myId = localUserStore.getChatId();
    const waName = get(matrixWaDisplayNameForColorStore);
    if (myId && matrixUserId === myId && waName?.trim()) {
        const fromWaName = getColorByString(waName);
        if (fromWaName) {
            localUserStore.setChatUserColorCache(matrixUserId, fromWaName);
            return fromWaName;
        }
    }
    if (colorFromMerger) {
        localUserStore.setChatUserColorCache(matrixUserId, colorFromMerger);
        return colorFromMerger;
    }
    return localUserStore.getChatUserColorCache(matrixUserId);
}
