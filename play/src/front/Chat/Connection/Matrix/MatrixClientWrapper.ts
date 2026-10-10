import { Buffer } from "buffer";

import type { ICreateClientOpts, MatrixClient, SecretStorage } from "matrix-js-sdk";
import { createClient, IndexedDBCryptoStore, IndexedDBStore, MatrixError } from "matrix-js-sdk";

import type { SecretStorageKeyDescriptionAesV1 } from "matrix-js-sdk/lib/secret-storage";
import { VerificationMethod } from "matrix-js-sdk/lib/types";
import type { LocalUser } from "../../../Connection/LocalUser";
import AccessSecretStorageDialog from "./AccessSecretStorageDialog.svelte";
import { matrixSecurity } from "./MatrixSecurity";
import { customMatrixLogger } from "./CustomMatrixLogger";
import { clearMatrixStores } from "./MatrixStoreCleanup";
import { initialSyncAwareFetch } from "./MatrixInitialSyncFetch";
// Inline worker (bundled as a same-origin blob) that drives matrix-js-sdk's IndexedDB store off the
// main thread. See matrixIndexedDbWorker.ts for why the entry script and `?worker&inline` are needed.
import MatrixIndexedDbWorker from "./matrixIndexedDbWorker?worker&inline";
import { modals } from "@wa-modals";

window.Buffer = Buffer;

export interface MatrixClientWrapperInterface {
    initMatrixClient(): Promise<MatrixClient>;
    cacheSecretStorageKey(keyId: string, key: Uint8Array<ArrayBuffer>): void;
}

export interface MatrixLocalUserStore {
    getLocalUser(): LocalUser | null;

    getMatrixDeviceId(userId: string): string | null;

    getMatrixAccessToken(): string | null;

    getMatrixRefreshToken(): string | null;

    getMatrixUserId(): string | null;

    getMatrixStoresNeedClearing(): boolean;

    setMatrixStoresNeedClearing(value: boolean): void;

    setMatrixDeviceId(deviceId: string, userId: string): void;

    setMatrixUserId(userId: string): void;

    setMatrixAccessToken(accessToken: string): void;

    setMatrixRefreshToken(refreshToken: string | null): void;

    setMatrixAccessTokenExpireDate(AccessTokenExpireDate: Date): void;

    getName(): string | null;
}

export class InvalidLoginTokenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidLoginTokenError";
    }
}

/**
 * The user is logged in to WorkAdventure but this browser holds no Matrix session at all (storage evicted,
 * session revoked on an earlier visit, login token refused or not exchanged, ...). Nothing in the
 * current page can recover from that; only a fresh OpenID login mints a new Matrix login token, so the UI
 * must offer the "reconnect" prompt rather than a dead-end error banner.
 */
export class MissingMatrixCredentialsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MissingMatrixCredentialsError";
    }
}

export class MatrixClientWrapper implements MatrixClientWrapperInterface {
    private client!: MatrixClient;
    private secretStorageKeys: Record<string, Uint8Array<ArrayBuffer>> = {};
    private secretStorageKeyRequestPromise: Promise<[string, Uint8Array<ArrayBuffer>] | null> | undefined;
    private clientClosed = false;

    constructor(
        private baseUrl: string,
        private localUserStore: MatrixLocalUserStore,
        private _createClient: (opts: ICreateClientOpts) => MatrixClient = createClient,
    ) {}

    public async initMatrixClient(): Promise<MatrixClient> {
        const userId = this.localUserStore.getLocalUser()?.uuid;

        if (!userId) {
            throw new Error("UserUUID is undefined, this is not supposed to happen.");
        }

        // The login token, if the page landed with one, was already exchanged (see exchangeLoginToken()): the
        // session to restore is the stored one.
        const {
            deviceId: matrixDeviceId,
            accessToken,
            refreshToken,
            matrixUserId,
        } = this.retrieveMatrixConnectionDataFromLocalStorage();

        if (!accessToken) {
            console.error("Unable to connect to matrix, access token is null");
            throw new MissingMatrixCredentialsError("Unable to connect to matrix, access token is null");
        }

        if (!matrixUserId) {
            console.error("Unable to connect to matrix, matrixUserId is null");
            throw new MissingMatrixCredentialsError("Unable to connect to matrix, matrixUserId is null");
        }

        if (!matrixDeviceId) {
            console.error("Unable to connect to matrix, matrixDeviceId is null");
            throw new MissingMatrixCredentialsError("Unable to connect to matrix, matrixDeviceId is null");
        }

        const { matrixStore, matrixCryptoStore } = this.matrixWebClientStore(matrixUserId);

        const matrixCreateClientOpts: ICreateClientOpts = {
            baseUrl: this.baseUrl,
            deviceId: matrixDeviceId,
            userId: matrixUserId,
            accessToken: accessToken,
            refreshToken: refreshToken ?? undefined,
            store: matrixStore,
            cryptoStore: matrixCryptoStore,
            cryptoCallbacks: {
                getSecretStorageKey: this.getSecretStorageKey.bind(this),
                cacheSecretStorageKey: (keyId, keyInfo, key) => {
                    this.cacheSecretStorageKey(keyId, key);
                },
            },
            logger: customMatrixLogger,
            verificationMethods: [
                VerificationMethod.Sas,
                //VerificationMethod.ShowQrCode,
                //VerificationMethod.Reciprocate,
            ],
            timelineSupport: true,
            fetchFn: initialSyncAwareFetch,
        };

        if (this.clientClosed) {
            throw new Error("Client has been closed before being initialized");
        }

        // Now, let's instantiate the Matrix client.
        this.client = this._createClient(matrixCreateClientOpts);

        if (this.localUserStore.getMatrixStoresNeedClearing()) {
            await clearMatrixStores(this.client);
            this.localUserStore.setMatrixStoresNeedClearing(false);
        }

        return this.client;
    }

    /**
     * Swaps the login token Synapse's SSO flow hands the page for a Matrix session, and stores that session.
     *
     * The token is single use and lives two minutes, so it is spent as soon as the page lands with it, and it is
     * never stored: a stored token outlived its two minutes, was shared by every tab and replayed by each of them.
     *
     * When the homeserver refuses the token, this throws an InvalidLoginTokenError straight away. When it does not
     * answer, the token was most likely never spent, so the exchange is retried a few times first.
     */
    public async exchangeLoginToken(loginToken: string, retryDelaysMs = [1_000, 3_000, 10_000]): Promise<void> {
        try {
            await this.loginWithToken(loginToken);
        } catch (e) {
            const [retryDelayMs, ...nextRetryDelaysMs] = retryDelaysMs;
            if (e instanceof InvalidLoginTokenError || retryDelayMs === undefined) {
                throw e;
            }
            console.warn("Unable to exchange the Matrix login token, retrying", e);
            await new Promise<void>((resolve) => {
                setTimeout(resolve, retryDelayMs);
            });
            await this.exchangeLoginToken(loginToken, nextRetryDelaysMs);
        }
    }

    private async loginWithToken(loginToken: string): Promise<void> {
        // A hung request would hold the chat back, since it waits for the exchange: give up and retry instead.
        const client = this._createClient({ baseUrl: this.baseUrl, localTimeoutMs: 10_000 });

        let response;
        try {
            // login(type, data) is deprecated in 41.8.0 in favour of loginRequest({ type, ...data }).
            response = await client.loginRequest({
                type: "m.login.token",
                token: loginToken,
                initial_device_display_name: "WorkAdventure",
            });
        } catch (e) {
            if (e instanceof MatrixError) {
                // The homeserver answered, so the login token has been spent (an m.login.token is single use)
                // or was rejected outright. Either way it must never be replayed.
                console.error("Invalid login token", e);
                throw new InvalidLoginTokenError("Invalid login token");
            }
            // No answer from the homeserver (network failure, CORS, aborted request): the token was most
            // likely never seen and stays usable.
            throw e;
        }
        const { user_id, access_token, refresh_token, expires_in_ms, device_id } = response;

        // The stores belong to the previous Matrix user: initMatrixClient() must clear them before it connects.
        // This has to be decided now, before the new user id overwrites the old one, and must survive a reload.
        if (this.localUserStore.getMatrixUserId() !== user_id) {
            this.localUserStore.setMatrixStoresNeedClearing(true);
        }
        this.localUserStore.setMatrixUserId(user_id);
        this.localUserStore.setMatrixAccessToken(access_token);
        this.localUserStore.setMatrixRefreshToken(refresh_token ?? null);
        this.localUserStore.setMatrixDeviceId(device_id, user_id);
        if (expires_in_ms !== undefined) {
            this.localUserStore.setMatrixAccessTokenExpireDate(new Date(Date.now() + expires_in_ms));
        }
    }

    private retrieveMatrixConnectionDataFromLocalStorage(): {
        deviceId: string | null;
        accessToken: string | null;
        refreshToken: string | null;
        matrixUserId: string | null;
    } {
        const accessToken = this.localUserStore.getMatrixAccessToken();
        const refreshToken = this.localUserStore.getMatrixRefreshToken();
        const matrixUserId = this.localUserStore.getMatrixUserId();
        const deviceId = matrixUserId ? this.localUserStore.getMatrixDeviceId(matrixUserId) : null;
        return { deviceId, accessToken, refreshToken, matrixUserId };
    }

    private matrixWebClientStore(matrixUserId: string) {
        const indexDbStore = new IndexedDBStore({
            indexedDB: globalThis.indexedDB,
            localStorage: globalThis.localStorage,
            dbName: "workadventure-matrix",
            // Run sync persistence on a dedicated web worker so the structured-clone of the
            // accumulated /sync blob (persistSyncData -> store.put) does not block the main
            // thread. Without this, matrix-js-sdk falls back to the main-thread backend and can
            // freeze the UI for several seconds on large stores.
            workerFactory: typeof Worker !== "undefined" ? () => new MatrixIndexedDbWorker() : undefined,
        });

        const indexDbCryptoStore = new IndexedDBCryptoStore(
            globalThis.indexedDB,
            `crypto-store-${this.baseUrl}-${matrixUserId}`,
        );

        return { matrixStore: indexDbStore, matrixCryptoStore: indexDbCryptoStore };
    }

    private async getSecretStorageKey({
        keys,
    }: {
        keys: Record<string, SecretStorageKeyDescriptionAesV1>;
    }): Promise<[string, Uint8Array<ArrayBuffer>] | null> {
        let keyId = await this.client.secretStorage.getDefaultKeyId();
        let keyInfo!: SecretStorage.SecretStorageKeyDescription;
        if (keyId) {
            // use the default SSSS key if set
            keyInfo = keys[keyId];
            if (!keyInfo) {
                // if the default key is not available, pretend the default key
                // isn't set
                keyId = null;
            }
        }
        if (keyId === null) {
            const keyInfoEntries = Object.entries(keys);
            if (keyInfoEntries.length > 1) {
                throw new Error("Multiple storage key requests not implemented");
            }
            [keyId, keyInfo] = keyInfoEntries[0];
        }

        if (this.secretStorageKeys[keyId]) {
            console.debug("getCryptoCallbacks from cache");
            return [keyId, this.secretStorageKeys[keyId]];
        }

        if (this.secretStorageKeyRequestPromise) {
            return this.secretStorageKeyRequestPromise;
        }

        this.secretStorageKeyRequestPromise = this.openSecretStorageKeyDialog(keyId, keyInfo).finally(() => {
            this.secretStorageKeyRequestPromise = undefined;
        });

        return this.secretStorageKeyRequestPromise;
    }

    private async openSecretStorageKeyDialog(
        keyId: string,
        keyInfo: SecretStorage.SecretStorageKeyDescription,
    ): Promise<[string, Uint8Array<ArrayBuffer>] | null> {
        const key = await new Promise<Uint8Array<ArrayBuffer> | null>((resolve) => {
            if (!matrixSecurity.shouldDisplayModal) {
                resolve(null);
                return;
            }
            modals.open(AccessSecretStorageDialog, {
                keyInfo,
                matrixClient: this.client,
                onClose: (key: Uint8Array<ArrayBuffer> | null) => resolve(key),
            });
        });

        if (key === null) {
            matrixSecurity.isEncryptionRequiredAndNotSet.set(true);
            return null;
        }
        this.cacheSecretStorageKey(keyId, key);
        return [keyId, key];
    }

    public cacheSecretStorageKey(keyId: string, key: Uint8Array<ArrayBuffer>) {
        this.secretStorageKeys[keyId] = key;
    }

    public stopClient() {
        this.clientClosed = true;
        if (this.client) {
            this.client.stopClient();
        }
    }
}
