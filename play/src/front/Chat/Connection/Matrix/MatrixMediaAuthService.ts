/**
 * Page-side coordinator for Matrix authenticated media (MSC3916 / spec v1.11).
 *
 * Media served by the authenticated endpoints (`/_matrix/client/v1/media/...`)
 * requires an `Authorization: Bearer` header. An `<img>` / `<audio>` / `<video>`
 * element cannot carry that header, so the header is injected by the media
 * service worker ({@link file://./../../../../../public/matrix-media-service-worker.js}).
 *
 * This service is the bridge between the Matrix client and that service worker:
 *   - it detects whether the homeserver supports authenticated media,
 *   - it answers the service worker's requests for the current access token
 *     (read live from the client, so token refreshes are picked up), and
 *   - it exposes whether URL producers should emit authenticated URLs.
 *
 * The URL producers stay synchronous, so {@link isEnabledForTagSrc} and
 * {@link isEnabledForDirectFetch} are synchronous. When the feature is not
 * enabled, callers keep their previous (legacy) behaviour unchanged.
 */
import type { MatrixClient } from "matrix-js-sdk";
import Debug from "debug";
import { serverSupportsAuthenticatedMedia } from "./MatrixMediaAuthCapability";

const debug = Debug("matrix-media-auth");

/** Message the service worker sends to a window to fetch the current media auth config. */
export const MEDIA_AUTH_CONFIG_REQUEST = "matrix-media-auth:get-config";

export interface MediaAuthConfig {
    accessToken: string | null;
    homeserverOrigin: string | null;
}

export class MatrixMediaAuthService {
    private client: MatrixClient | undefined;
    private homeserverOrigin: string | null = null;
    private capabilitySupported = false;
    private messageResponderInstalled = false;

    /**
     * Wires the service to a freshly initialised Matrix client and runs the
     * (memoised) homeserver capability detection. Safe to call again on
     * reconnection.
     */
    async configure(client: MatrixClient): Promise<void> {
        // Never throw into the caller's init flow: any failure just keeps legacy media.
        try {
            this.client = client;
            this.homeserverOrigin = safeOrigin(client.getHomeserverUrl());
            this.installMessageResponder();
            this.capabilitySupported = await serverSupportsAuthenticatedMedia(client);
        } catch (error) {
            debug("configure failed, keeping legacy media: %o", error);
            this.capabilitySupported = false;
        }
        debug("configured: authenticatedMedia=%s homeserverOrigin=%s", this.capabilitySupported, this.homeserverOrigin);
    }

    /** Clears the current client and removes the service-worker responder (e.g. on logout / client stop). */
    reset(): void {
        if (this.messageResponderInstalled && typeof navigator !== "undefined" && navigator.serviceWorker) {
            navigator.serviceWorker.removeEventListener("message", this.onServiceWorkerMessage);
            this.messageResponderInstalled = false;
        }
        this.client = undefined;
        this.homeserverOrigin = null;
        this.capabilitySupported = false;
    }

    /**
     * Whether media URLs consumed by DOM elements (`<img>`, `<audio>`, `<video>`,
     * download links) should target the authenticated endpoints. Requires both a
     * capable homeserver AND a controlling service worker able to inject the auth
     * header — otherwise the authenticated URLs would answer 401.
     */
    isEnabledForTagSrc(): boolean {
        return this.capabilitySupported && this.hasControllingServiceWorker();
    }

    /**
     * Whether media fetched directly by the page (encrypted attachments, which
     * are downloaded and decrypted in-memory) should target the authenticated
     * endpoints. Does not need the service worker because {@link getAuthorizationHeader}
     * is applied to the request explicitly.
     */
    isEnabledForDirectFetch(): boolean {
        return this.capabilitySupported;
    }

    /** Authorization header for a direct authenticated-media fetch, or undefined when unavailable. */
    getAuthorizationHeader(): Record<string, string> | undefined {
        const token = this.client?.getAccessToken();
        return token ? { Authorization: `Bearer ${token}` } : undefined;
    }

    private hasControllingServiceWorker(): boolean {
        return typeof navigator !== "undefined" && Boolean(navigator.serviceWorker?.controller);
    }

    private installMessageResponder(): void {
        if (this.messageResponderInstalled || typeof navigator === "undefined" || !navigator.serviceWorker) {
            return;
        }
        this.messageResponderInstalled = true;
        navigator.serviceWorker.addEventListener("message", this.onServiceWorkerMessage);
    }

    /**
     * Replies to the media service worker's request for the current access token.
     * The token is read live from the client so token refreshes are always honoured.
     */
    private readonly onServiceWorkerMessage = (event: MessageEvent): void => {
        if (!isConfigRequest(event.data)) {
            return;
        }
        const port = event.ports[0];
        if (!port) {
            return;
        }
        const config: MediaAuthConfig = {
            accessToken: this.client?.getAccessToken() ?? null,
            homeserverOrigin: this.homeserverOrigin,
        };
        port.postMessage(config);
    };
}

function isConfigRequest(data: unknown): boolean {
    return typeof data === "object" && data !== null && (data as { type?: unknown }).type === MEDIA_AUTH_CONFIG_REQUEST;
}

function safeOrigin(url: string | undefined | null): string | null {
    if (!url) {
        return null;
    }
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

export const matrixMediaAuthService = new MatrixMediaAuthService();
