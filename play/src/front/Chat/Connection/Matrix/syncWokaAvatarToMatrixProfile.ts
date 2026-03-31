import type { MatrixClient } from "matrix-js-sdk";
import * as Sentry from "@sentry/svelte";
import { defaultWoka } from "@workadventure/shared-utils";
import { writeWaAvatarToMatrixAccountData } from "./matrixWaAccountData";
import Debug from "debug";

const debug = Debug("matrix");

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
