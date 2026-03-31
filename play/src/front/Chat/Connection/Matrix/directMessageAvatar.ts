import type { MatrixClient } from "matrix-js-sdk";
import { get } from "svelte/store";
import { localUserStore } from "../../../Connection/LocalUserStore";
import type { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";

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
 * Avatar URL for a DM peer: Matrix room member → UserProviderMerger (WOKA) → global Matrix profile → cache.
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

    if (merger) {
        const woka = getWokaPictureUrlFromUserProviderMerger(matrixUserId, merger);
        if (woka) {
            localUserStore.setDirectMessagePeerAvatarUrlCache(matrixUserId, woka);
            return woka;
        }
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

    return localUserStore.getDirectMessagePeerAvatarUrlCache(matrixUserId);
}
