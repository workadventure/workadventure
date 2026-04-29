import type { MatrixClient, RoomMember } from "matrix-js-sdk";
import Debug from "debug";
import type { UserProviderMerger } from "../../../UserProviderMerger/UserProviderMerger";
import { resolveDirectMessagePeerAvatarUrl } from "./WaMatrixProfileService";

const debug = Debug("MatrixChatConnection");

export class MatrixAvatarProfile {
    private readonly singletonMapTimeOutGetAvatar = new Map<string, { expire: number; resolve: string | undefined }>();

    getAvatarUrl(
        matrixUserId: string,
        roomMember: RoomMember,
        baseUrl: string,
        matrixClient: MatrixClient,
        mergerContext: UserProviderMerger | undefined
    ): string | undefined {
        const entry = this.singletonMapTimeOutGetAvatar.get(matrixUserId);
        if (entry && entry.expire > Date.now()) {
            debug("Return cached avatar url for", matrixUserId, "=>", entry.resolve);
            return entry.resolve;
        }
        const http = roomMember.getAvatarUrl(baseUrl, 96, 96, "scale", false, false);
        const avatarUrl = resolveDirectMessagePeerAvatarUrl(
            matrixUserId,
            http ?? undefined,
            matrixClient,
            mergerContext
        );
        this.singletonMapTimeOutGetAvatar.set(matrixUserId, { expire: Date.now() + 5000, resolve: avatarUrl });
        debug("Return avatar url for", matrixUserId, "=>", avatarUrl);
        return avatarUrl;
    }
}

export const matrixAvatarProfile = new MatrixAvatarProfile();
