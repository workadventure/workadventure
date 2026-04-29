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

function formatAvatarUrlForDebug(url: string | undefined): string | undefined {
    if (url === undefined) {
        return undefined;
    }
    if (url.startsWith("data:")) {
        const mediaTypeEnd = url.indexOf(",");
        const mediaType = mediaTypeEnd >= 0 ? url.slice(0, mediaTypeEnd) : "data:";
        return `${mediaType},... (${url.length} chars)`;
    }

    try {
        const parsedUrl = new URL(url, window.location.href);
        parsedUrl.search = "";
        parsedUrl.hash = "";
        return parsedUrl.toString();
    } catch {
        return url;
    }
}

export class MatrixAvatarProfile {
    private readonly avatarUrlCache = new Map<string, AvatarCacheEntry>();
    private readonly lazyAvatarStoresByUser = new Map<string, Set<LazyAvatarStoreState>>();

    createLazyAvatarStore(matrixUserId: string, resolveAvatarUrl: () => string | undefined): LazyPictureStore {
        debug("Create lazy avatar store for %s", matrixUserId);
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
            debug("Load lazy avatar store for %s forceRefresh=%s", matrixUserId, forceRefresh);
            state.hasLoaded = true;
            const avatarUrl = await this.getCachedAvatarUrl(matrixUserId, state.resolveAvatarUrl, forceRefresh);
            debug("Lazy avatar store loaded for %s => %s", matrixUserId, formatAvatarUrlForDebug(avatarUrl));
            state.set(avatarUrl);
        };

        return {
            subscribe: store.subscribe,
            load: () => loadFromCache(false),
            refresh: () => {
                debug("Refresh lazy avatar store for %s hasLoaded=%s", matrixUserId, state.hasLoaded);
                this.markAvatarUrlStale(matrixUserId);
                if (!state.hasLoaded) {
                    debug("Skip refresh for %s because store has not been loaded yet", matrixUserId);
                    return Promise.resolve();
                }
                return loadFromCache(true);
            },
            invalidate: () => {
                debug("Invalidate lazy avatar store for %s", matrixUserId);
                this.invalidateAvatarUrl(matrixUserId);
            },
            destroy: () => {
                debug("Destroy lazy avatar store for %s", matrixUserId);
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
        debug("Return avatar url for %s => %s", matrixUserId, formatAvatarUrlForDebug(avatarUrl));
        return avatarUrl;
    }

    resolveUserAvatarUrl(matrixUserId: string, matrixClient: MatrixClient): string | undefined {
        const avatarUrl = resolveDirectMessagePeerAvatarUrl(matrixUserId, undefined, matrixClient, undefined);
        debug("Return user avatar url for %s => %s", matrixUserId, formatAvatarUrlForDebug(avatarUrl));
        return avatarUrl;
    }

    invalidateAvatarUrl(matrixUserId: string): void {
        debug("Invalidate avatar URL cache for %s", matrixUserId);
        this.markAvatarUrlStale(matrixUserId);
        const stores = this.lazyAvatarStoresByUser.get(matrixUserId);
        stores?.forEach((store) => {
            if (!store.hasLoaded) {
                debug("Skip invalidated store refresh for %s because store has not been loaded yet", matrixUserId);
                return;
            }
            debug("Refresh invalidated loaded store for %s", matrixUserId);
            this.getCachedAvatarUrl(matrixUserId, store.resolveAvatarUrl, true)
                .then((avatarUrl) => {
                    debug("Invalidated store refreshed for %s => %s", matrixUserId, formatAvatarUrlForDebug(avatarUrl));
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
        debug("Mark avatar URL cache stale for %s previousValid=%s", matrixUserId, entry?.valid ?? false);
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
            debug("Return cached avatar url for %s => %s", matrixUserId, formatAvatarUrlForDebug(entry.value));
            return Promise.resolve(entry.value);
        }
        if (entry?.pending) {
            debug("Return pending avatar URL promise for %s", matrixUserId);
            return entry.pending;
        }

        debug("Resolve avatar URL for %s forceRefresh=%s previousValid=%s", matrixUserId, forceRefresh, !!entry?.valid);
        const pending = Promise.resolve()
            .then(resolveAvatarUrl)
            .then(
                (avatarUrl) => {
                    debug("Resolved avatar URL for %s => %s", matrixUserId, formatAvatarUrlForDebug(avatarUrl));
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
