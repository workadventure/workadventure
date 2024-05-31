import {
    createClient,
    ICreateClientOpts,
    IndexedDBCryptoStore,
    IndexedDBStore,
    MatrixClient,
    SecretStorage,
} from "matrix-js-sdk";
import Olm from "@matrix-org/olm";
import { Buffer } from "buffer/";
import { SecretStorageKeyDescriptionAesV1 } from "matrix-js-sdk/lib/secret-storage";
// eslint-disable-next-line import/no-unresolved
import { openModal } from "svelte-modals";
import { LocalUser } from "../../../Connection/LocalUser";
import AccessSecretStorageDialog from "./AccessSecretStorageDialog.svelte";

// @ts-ignore
window.Buffer = Buffer;

global.Olm = Olm;

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

export class MatrixClientWrapper implements MatrixClientWrapperInterface {
    private client!: MatrixClient;

    private secretStorageKeys: Record<string, Uint8Array> = {};

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
            console.warn("retrieveMatrixConnectionDataFromLoginToken");
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
            this.localUserStore.setMatrixLoginToken(null);
        }

        if (accessToken === null && refreshToken === null) {
            console.warn("registerMatrixGuestUser");
            const {
                accessToken: accessTokenFromGuestUser,
                refreshToken: refreshTokenFromGuestUser,
                matrixUserId: matrixUserIdFromGuestUser,
                device_id,
            } = await this.registerMatrixGuestUser();
            accessToken = accessTokenFromGuestUser;
            refreshToken = refreshTokenFromGuestUser;
            matrixUserId = matrixUserIdFromGuestUser;
            matrixDeviceId = device_id;
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
        // Now, let's instantiate the Matrix client.
        this.client = this._createClient({
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
        });

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

    private async registerMatrixGuestUser(): Promise<{
        matrixUserId: string;
        accessToken: string | null;
        refreshToken: string | null;
        device_id: string | null;
    }> {
        const client = this._createClient({
            baseUrl: this.baseUrl,
        });
        try {
            const { access_token, refresh_token, user_id, device_id } = await client.registerGuest({
                body: {
                    initial_device_display_name: this.localUserStore.getName() || "",
                    refresh_token: true,
                },
            });
            this.localUserStore.setMatrixUserId(user_id);
            if (access_token !== undefined) {
                this.localUserStore.setMatrixAccessToken(access_token);
            }
            this.localUserStore.setMatrixRefreshToken(refresh_token ?? null);
            if (device_id !== undefined) {
                this.localUserStore.setMatrixDeviceId(device_id, user_id);
            }
            console.debug(device_id);
            return {
                matrixUserId: user_id,
                accessToken: access_token ?? null,
                refreshToken: refresh_token ?? null,
                device_id: device_id ?? null,
            };
        } catch (error) {
            console.error(error);
            throw new Error("Unable to etablish a Matrix Guest connection");
        }
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
        const client = this._createClient({
            baseUrl: matrixServerUrl,
        });

        const { user_id, access_token, refresh_token, expires_in_ms, device_id } = await client.login("m.login.token", {
            token: loginToken,
            //device_id: deviceId,
            initial_device_display_name: "WorkAdventure",
        });

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
            openModal(AccessSecretStorageDialog, {
                keyInfo,
                matrixClient: this.client,
                onClose: (key: Uint8Array) => resolve(key),
            });
        });

        if (key === null) {
            throw Error("No recovery key provided");
        }
        this.cacheSecretStorageKey(keyId, key);
        return [keyId, key];
    }

    public cacheSecretStorageKey(keyId: string, key: Uint8Array) {
        this.secretStorageKeys[keyId] = key;
    }
}
