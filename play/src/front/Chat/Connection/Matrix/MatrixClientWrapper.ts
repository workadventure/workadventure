import { Buffer } from "buffer";
import Olm from "@matrix-org/olm";

import {
    createClient,
    ICreateClientOpts,
    IndexedDBCryptoStore,
    IndexedDBStore,
    MatrixClient,
    SecretStorage,
} from "matrix-js-sdk";

import { SecretStorageKeyDescriptionAesV1 } from "matrix-js-sdk/lib/secret-storage";
import { openModal } from "svelte-modals";
import { VerificationMethod } from "matrix-js-sdk/lib/types";
import * as Sentry from "@sentry/svelte";
import { LocalUser } from "../../../Connection/LocalUser";
import AccessSecretStorageDialog from "./AccessSecretStorageDialog.svelte";
import { matrixSecurity } from "./MatrixSecurity";
import { customMatrixLogger } from "./CustomMatrixLogger";

globalThis.Olm = Olm;
window.Buffer = Buffer;

export interface MatrixClientWrapperInterface {
    initMatrixClient(): Promise<MatrixClient>;
    cacheSecretStorageKey(keyId: string, key: Uint8Array): void;
}

export interface MatrixLocalUserStore {
    getLocalUser(): LocalUser | null;

    getMatrixDeviceId(userId: string): string | null;

    getMatrixAccessToken(): string | null;

    getMatrixRefreshToken(): string | null;

    getMatrixUserId(): string | null;

    getMatrixLoginToken(): string | null;

    setMatrixDeviceId(deviceId: string, userId: string): void;

    setMatrixLoginToken(loginToken: string | null): void;

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

export class MatrixClientWrapper implements MatrixClientWrapperInterface {
    private client!: MatrixClient;
    private secretStorageKeys: Record<string, Uint8Array> = {};
    private clientClosed = false;

    constructor(
        private baseUrl: string,
        private localUserStore: MatrixLocalUserStore,
        private _createClient: (opts: ICreateClientOpts) => MatrixClient = createClient
    ) {}

    public async initMatrixClient(): Promise<MatrixClient> {
        const userId = this.localUserStore.getLocalUser()?.uuid;

        if (!userId) {
            throw new Error("UserUUID is undefined, this is not supposed to happen.");
        }

        let accessToken: string | null,
            refreshToken: string | null,
            matrixUserId: string | null,
            matrixDeviceId: string | null;
        const {
            deviceId,
            accessToken: accessTokenFromLocalStorage,
            refreshToken: refreshTokenFromLocalStorage,
            matrixLoginToken,
            matrixUserId: matrixUserIdFromLocalStorage,
        } = this.retrieveMatrixConnectionDataFromLocalStorage();
        accessToken = accessTokenFromLocalStorage;
        refreshToken = refreshTokenFromLocalStorage;
        matrixUserId = matrixUserIdFromLocalStorage;
        matrixDeviceId = deviceId;

        const oldMatrixUserId: string | null = matrixUserIdFromLocalStorage;

        if (matrixLoginToken !== null) {
            const {
                accessToken: accessTokenFromLoginToken,
                refreshToken: refreshTokenFromLoginToken,
                matrixUserId: userIdFromLoginToken,
                deviceId,
            } = await this.retrieveMatrixConnectionDataFromLoginToken(this.baseUrl, matrixLoginToken);
            accessToken = accessTokenFromLoginToken;
            refreshToken = refreshTokenFromLoginToken;
            matrixUserId = userIdFromLoginToken;
            matrixDeviceId = deviceId;
        }

        if (!accessToken) {
            console.error("Unable to connect to matrix, access token is null");
            throw new Error("Unable to connect to matrix, access token is null");
        }

        if (!matrixUserId) {
            console.error("Unable to connect to matrix, matrixUserId is null");
            throw new Error("Unable to connect to matrix, matrixUserId is null");
        }

        if (!matrixDeviceId) {
            console.error("Unable to connect to matrix, matrixDeviceId is null");
            throw new Error("Unable to connect to matrix, matrixDeviceId is null");
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
        };

        if (this.clientClosed) {
            throw new Error("Client has been closed before being initialized");
        }

        // Now, let's instantiate the Matrix client.
        this.client = this._createClient(matrixCreateClientOpts);

        if (oldMatrixUserId !== matrixUserId) {
            await this.client.clearStores();
        }

        return this.client;
    }

    private retrieveMatrixConnectionDataFromLocalStorage(): {
        deviceId: string | null;
        accessToken: string | null;
        refreshToken: string | null;
        matrixUserId: string | null;
        matrixLoginToken: string | null;
    } {
        const accessToken = this.localUserStore.getMatrixAccessToken();
        const refreshToken = this.localUserStore.getMatrixRefreshToken();
        const matrixUserId = this.localUserStore.getMatrixUserId();
        const deviceId = matrixUserId ? this.localUserStore.getMatrixDeviceId(matrixUserId) : null;
        const matrixLoginToken = this.localUserStore.getMatrixLoginToken();
        return { deviceId, accessToken, refreshToken, matrixUserId, matrixLoginToken };
    }

    private matrixWebClientStore(matrixUserId: string) {
        const indexDbStore = new IndexedDBStore({
            indexedDB: globalThis.indexedDB,
            localStorage: globalThis.localStorage,
            dbName: "workadventure-matrix",
        });

        const indexDbCryptoStore = new IndexedDBCryptoStore(
            globalThis.indexedDB,
            `crypto-store-${this.baseUrl}-${matrixUserId}`
        );

        return { matrixStore: indexDbStore, matrixCryptoStore: indexDbCryptoStore };
    }

    private async retrieveMatrixConnectionDataFromLoginToken(
        matrixServerUrl: string,
        loginToken: string
    ): Promise<{
        matrixUserId: string;
        accessToken: string;
        refreshToken: string | null;
        deviceId: string;
    }> {
        const options: ICreateClientOpts = {
            baseUrl: matrixServerUrl,
        };

        const client = this._createClient(options);

        try {
            const { user_id, access_token, refresh_token, expires_in_ms, device_id } = await client.login(
                "m.login.token",
                {
                    token: loginToken,
                    initial_device_display_name: "WorkAdventure",
                }
            );

            this.localUserStore.setMatrixUserId(user_id);
            this.localUserStore.setMatrixAccessToken(access_token);
            this.localUserStore.setMatrixRefreshToken(refresh_token ?? null);
            this.localUserStore.setMatrixDeviceId(device_id, user_id);
            if (expires_in_ms !== undefined) {
                const expireDate = new Date();
                // Add response.expires_in milliseconds to the current date.
                expireDate.setMilliseconds(expireDate.getMilliseconds() + expires_in_ms);
                this.localUserStore.setMatrixAccessTokenExpireDate(expireDate);
            }

            //Login token has been used, remove it from local storage
            this.localUserStore.setMatrixLoginToken(null);

            // Note: we ignore the device ID returned by the server. We use the one we generated.
            // This will be required in the future when we switch to a Native OpenID Matrix client.
            return {
                matrixUserId: user_id,
                accessToken: access_token,
                refreshToken: refresh_token ?? null,
                deviceId: device_id,
            };
        } catch (e) {
            console.error(e);
            Sentry.captureException(e, {
                extra: {
                    loginToken,
                },
            });

            throw new InvalidLoginTokenError("Invalid login token");
        }
    }

    private async getSecretStorageKey({
        keys,
    }: {
        keys: Record<string, SecretStorageKeyDescriptionAesV1>;
    }): Promise<[string, Uint8Array] | null> {
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

        const key = await new Promise<Uint8Array | null>((resolve, reject) => {
            if (!matrixSecurity.shouldDisplayModal) {
                resolve(null);
                return;
            }
            openModal(AccessSecretStorageDialog, {
                keyInfo,
                matrixClient: this.client,
                onClose: (key: Uint8Array | null) => resolve(key),
            });
        });

        if (key === null) {
            matrixSecurity.isEncryptionRequiredAndNotSet.set(true);
            return null;
        }
        this.cacheSecretStorageKey(keyId, key);
        return [keyId, key];
    }

    public cacheSecretStorageKey(keyId: string, key: Uint8Array) {
        this.secretStorageKeys[keyId] = key;
    }

    public stopClient() {
        this.clientClosed = true;
        if (this.client) {
            this.client.stopClient();
        }
    }
}
