import type { MatrixClient } from "matrix-js-sdk";
import * as Sentry from "@sentry/svelte";
import { defaultWoka } from "@workadventure/shared-utils";

export type SyncWokaAvatarToMatrixResult = "synced" | "unchanged" | "skipped_no_woka" | "skipped_guest" | "failed";

/** Serialize concurrent syncs (WOKA store can emit quickly). */
let syncChain: Promise<unknown> = Promise.resolve();

/** In-session dedup only (Matrix profile is the source of truth; no localStorage). */
const lastSyncedWokaAvatarContentHashByMatrixUserId = new Map<string, string>();

/**
 * Pushes the in-game WOKA snapshot to the Matrix global avatar when image bytes change (SHA-256),
 * skipping repeats within the same browser session.
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
        return "skipped_guest";
    }

    const userId = client.getSafeUserId();
    if (!userId) {
        return "skipped_no_woka";
    }

    if (!wokaImageSrc || wokaImageSrc === defaultWoka) {
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
            return "unchanged";
        }

        const mime = blob.type && blob.type !== "application/octet-stream" ? blob.type : "image/png";
        const upload = await client.uploadContent(blob, {
            type: mime,
            name: "avatar.png",
        });

        await client.setAvatarUrl(upload.content_uri);
        lastSyncedWokaAvatarContentHashByMatrixUserId.set(userId, hash);
        return "synced";
    } catch (error) {
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
