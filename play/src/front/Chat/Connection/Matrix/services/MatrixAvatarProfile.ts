import type { MatrixClient, RoomMember } from "matrix-js-sdk";
import Debug from "debug";
import { writable } from "svelte/store";
import type { LazyPictureStore } from "../../../../Stores/PictureStore";
import type { UserProviderMerger } from "../../../UserProviderMerger/UserProviderMerger";
import { resolveDirectMessagePeerAvatarUrl } from "./WaMatrixProfileService";

const debug = Debug("MatrixChatConnection");

type AvatarCacheEntry = {
    value: string | undefined;
    valid: boolean;
    pending?: Promise<string | undefined>;
};

type LazyAvatarStoreState = {
    set: (avatarUrl: string | undefined) => void;
    resolveAvatarUrl: () => string | undefined;
    hasLoaded: boolean;
};

export class MatrixAvatarProfile {
    private readonly avatarUrlCache = new Map<string, AvatarCacheEntry>();
    private readonly lazyAvatarStoresByUser = new Map<string, Set<LazyAvatarStoreState>>();

    createLazyAvatarStore(matrixUserId: string, resolveAvatarUrl: () => string | undefined): LazyPictureStore {
        const store = writable<string | undefined>(undefined);
        const state: LazyAvatarStoreState = {
            set: store.set,
            resolveAvatarUrl,
            hasLoaded: false,
        };
        const stores = this.lazyAvatarStoresByUser.get(matrixUserId) ?? new Set<LazyAvatarStoreState>();
        stores.add(state);
        this.lazyAvatarStoresByUser.set(matrixUserId, stores);

        const loadFromCache = async (forceRefresh = false): Promise<void> => {
            state.hasLoaded = true;
            const avatarUrl = await this.getCachedAvatarUrl(matrixUserId, state.resolveAvatarUrl, forceRefresh);
            state.set(avatarUrl);
        };

        return {
            subscribe: store.subscribe,
            load: () => loadFromCache(false),
            refresh: () => {
                this.markAvatarUrlStale(matrixUserId);
                if (!state.hasLoaded) {
                    return Promise.resolve();
                }
                return loadFromCache(true);
            },
            invalidate: () => {
                this.invalidateAvatarUrl(matrixUserId);
            },
            destroy: () => {
                stores.delete(state);
                if (stores.size === 0) {
                    this.lazyAvatarStoresByUser.delete(matrixUserId);
                }
            },
        };
    }

    resolveAvatarUrl(
        matrixUserId: string,
        roomMember: RoomMember,
        baseUrl: string,
        matrixClient: MatrixClient,
        mergerContext: UserProviderMerger | undefined
    ): string | undefined {
        const http = roomMember.getAvatarUrl(baseUrl, 96, 96, "scale", false, false);
        const avatarUrl = resolveDirectMessagePeerAvatarUrl(
            matrixUserId,
            http ?? undefined,
            matrixClient,
            mergerContext
        );
        return avatarUrl;
    }

    resolveUserAvatarUrl(matrixUserId: string, matrixClient: MatrixClient): string | undefined {
        const avatarUrl = resolveDirectMessagePeerAvatarUrl(matrixUserId, undefined, matrixClient, undefined);
        return avatarUrl;
    }

    invalidateAvatarUrl(matrixUserId: string): void {
        this.markAvatarUrlStale(matrixUserId);
        const stores = this.lazyAvatarStoresByUser.get(matrixUserId);
        stores?.forEach((store) => {
            if (!store.hasLoaded) {
                return;
            }
            this.getCachedAvatarUrl(matrixUserId, store.resolveAvatarUrl, true)
                .then((avatarUrl) => {
                    store.set(avatarUrl);
                })
                .catch((error) => {
                    debug("Failed to refresh Matrix avatar for %s: %o", matrixUserId, error);
                    console.warn("Failed to refresh Matrix avatar", error);
                });
        });
    }

    private markAvatarUrlStale(matrixUserId: string): void {
        const entry = this.avatarUrlCache.get(matrixUserId);
        this.avatarUrlCache.set(matrixUserId, {
            value: entry?.value,
            valid: false,
        });
    }

    private getCachedAvatarUrl(
        matrixUserId: string,
        resolveAvatarUrl: () => string | undefined,
        forceRefresh: boolean
    ): Promise<string | undefined> {
        const entry = this.avatarUrlCache.get(matrixUserId);
        if (!forceRefresh && entry?.valid && entry.value !== undefined) {
            return Promise.resolve(entry.value);
        }
        if (entry?.pending) {
            return entry.pending;
        }

        const pending = Promise.resolve()
            .then(resolveAvatarUrl)
            .then(
                (avatarUrl) => {
                    this.avatarUrlCache.set(matrixUserId, {
                        value: avatarUrl,
                        valid: true,
                    });
                    return avatarUrl;
                },
                (error) => {
                    debug("Failed to resolve avatar URL for %s: %o", matrixUserId, error);
                    const currentEntry = this.avatarUrlCache.get(matrixUserId);
                    if (currentEntry?.pending === pending) {
                        this.avatarUrlCache.delete(matrixUserId);
                    }
                    throw error;
                }
            );

        this.avatarUrlCache.set(matrixUserId, {
            value: entry?.value,
            valid: false,
            pending,
        });

        return pending;
    }
}

export const matrixAvatarProfile = new MatrixAvatarProfile();
