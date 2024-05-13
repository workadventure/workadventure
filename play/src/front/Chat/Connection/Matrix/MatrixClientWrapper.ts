import { createClient, ICreateClientOpts, IndexedDBCryptoStore, IndexedDBStore, MatrixClient } from "matrix-js-sdk";
//import { localUserStore } from "../../../Connection/LocalUserStore";
import { LocalUser } from "../../../Connection/LocalUser";

export interface MatrixClientWrapperInterface {
    initMatrixClient(): Promise<MatrixClient>;
}

export interface MatrixLocalUserStore {
    getLocalUser() : LocalUser | null;
    getMatrixDeviceId(userId : string) : string;
    getMatrixAccessToken():string;
    getMatrixRefreshToken():string;
    getMatrixUserId():string;
    getMatrixLoginToken():string;
    setMatrixDeviceId(deviceId : string, userId : string) : void ;
    setMatrixLoginToken(loginToken : string|null):void;
    setMatrixUserId(userId :string):void;
    setMatrixAccessToken(accessToken : string):void;
    setMatrixRefreshToken(refreshToken : string | null):void;
    setMatrixAccessTokenExpireDate(AccessTokenExpireDate : Date) :void;
    getName():string;
}


export class MatrixClientWrapper implements MatrixClientWrapperInterface {
    constructor(private baseUrl: string ,private localUserStore : MatrixLocalUserStore , private _createClient : (opts: ICreateClientOpts)=> MatrixClient = createClient) {}

    public async initMatrixClient(): Promise<MatrixClient> {
        const userId = this.localUserStore.getLocalUser()?.uuid;
        if (!userId) {
            throw new Error("UserUUID is undefined, this is not supposed to happen.");
        }

        let accessToken: string | null, refreshToken: string | null, matrixUserId: string | null;
        const {
            deviceId,
            accessToken: accessTokenFromLocalStorage,
            refreshToken: refreshTokenFromLocalStorage,
            matrixLoginToken,
            matrixUserId: matrixUserIdFromLocalStorage,
        } = this.retrieveMatrixConnectionDataFromLocalStorage(userId);
        accessToken = accessTokenFromLocalStorage;
        refreshToken = refreshTokenFromLocalStorage;
        matrixUserId = matrixUserIdFromLocalStorage;

        const oldMatrixUserId: string | null = matrixUserIdFromLocalStorage;

        if (matrixLoginToken !== null) {
            const {
                accessToken: accessTokenFromLoginToken,
                refreshToken: refreshTokenFromLoginToken,
                matrixUserId: userIdFromLoginToken,
            } = await this.retrieveMatrixConnectionDataFromLoginToken(this.baseUrl, matrixLoginToken, deviceId);
            accessToken = accessTokenFromLoginToken;
            refreshToken = refreshTokenFromLoginToken;
            matrixUserId = userIdFromLoginToken;
            this.localUserStore.setMatrixLoginToken(null);
        }

        if (accessToken === null && refreshToken === null) {
            const {
                accessToken: accessTokenFromGuestUser,
                refreshToken: refreshTokenFromGuestUser,
                matrixUserId: matrixUserIdFromGuestUser,
            } = await this.registerMatrixGuestUser();
            accessToken = accessTokenFromGuestUser;
            refreshToken = refreshTokenFromGuestUser;
            matrixUserId = matrixUserIdFromGuestUser;
        }

        if (!accessToken) {
            console.error("Unable to connect to matrix, access token is null");
            throw new Error("Unable to connect to matrix, access token is null");
        }

        if (!matrixUserId) {
            console.error("Unable to connect to matrix, matrixUserId is null");
            throw new Error("Unable to connect to matrix, matrixUserId is null");
        }

        const { matrixStore, matrixCryptoStore } = this.matrixWebClientStore(matrixUserId, deviceId);
        // Now, let's instantiate the Matrix client.
        const matrixClient = this._createClient({
            baseUrl: this.baseUrl,
            deviceId,
            userId: matrixUserId,
            accessToken: accessToken,
            refreshToken: refreshToken ?? undefined,
            store: matrixStore,
            cryptoStore: matrixCryptoStore,
        });

        if (oldMatrixUserId !== matrixUserId) {
            console.log(oldMatrixUserId , matrixUserId);
            await matrixClient.clearStores();
        }

        return matrixClient;
    }

    private retrieveMatrixConnectionDataFromLocalStorage(userId: string) : {
        deviceId : string, accessToken : string, refreshToken : string, matrixUserId : string, matrixLoginToken : string
    } {
        let deviceId = this.localUserStore.getMatrixDeviceId(userId);
        if (deviceId === null) {
            deviceId = this.generateDeviceId();
            this.localUserStore.setMatrixDeviceId(deviceId, userId);
        }
        const accessToken = this.localUserStore.getMatrixAccessToken();
        const refreshToken = this.localUserStore.getMatrixRefreshToken();
        const matrixUserId = this.localUserStore.getMatrixUserId();
        const matrixLoginToken = this.localUserStore.getMatrixLoginToken();
        return { deviceId, accessToken, refreshToken, matrixUserId, matrixLoginToken };
    }

    private async registerMatrixGuestUser(): Promise<{
        matrixUserId: string;
        accessToken: string | null;
        refreshToken: string | null;
    }> {
        const client = this._createClient({
            baseUrl: this.baseUrl,
        });
        try {
            const { access_token, refresh_token, user_id } = await client.registerGuest({
                body: {
                    initial_device_display_name: this.localUserStore.getName() || "",
                    refresh_token: true,
                },
            });
            this.localUserStore.setMatrixUserId(user_id);
            this.localUserStore.setMatrixAccessToken(access_token ?? null);
            this.localUserStore.setMatrixRefreshToken(refresh_token ?? null);
            client.setGuest(true);
            return { matrixUserId: user_id, accessToken: access_token ?? null, refreshToken: refresh_token ?? null };
        } catch (error) {
            console.error(error);
            throw new Error("Unable to etablish a Matrix Guest connection");
        }
    }

    private matrixWebClientStore(matrixUserId: string, deviceId: string) {
        const indexDbStore = new IndexedDBStore({
            indexedDB: globalThis.indexedDB,
            localStorage: globalThis.localStorage,
            dbName: "workadventure-matrix",
        });

        const indexDbCryptoStore = new IndexedDBCryptoStore(
            globalThis.indexedDB,
            "crypto-store-" + this.baseUrl + "-" + matrixUserId + "-" + deviceId
        );

        return { matrixStore: indexDbStore, matrixCryptoStore: indexDbCryptoStore };
    }

    private async retrieveMatrixConnectionDataFromLoginToken(
        matrixServerUrl: string,
        loginToken: string,
        deviceId: string
    ): Promise<{
        matrixUserId: string;
        accessToken: string;
        refreshToken: string | null;
    }> {
        const client = this._createClient({
            baseUrl: matrixServerUrl,
        });

        const { user_id, access_token, refresh_token, expires_in_ms } = await client.login("m.login.token", {
            token: loginToken,
            device_id: deviceId,
            initial_device_display_name: "WorkAdventure",
        });

        this.localUserStore.setMatrixUserId(user_id);
        this.localUserStore.setMatrixAccessToken(access_token);
        this.localUserStore.setMatrixRefreshToken(refresh_token ?? null);
        if (expires_in_ms !== undefined) {
            const expireDate = new Date();
            // Add response.expires_in milliseconds to the current date.
            expireDate.setMilliseconds(expireDate.getMilliseconds() + expires_in_ms);
            this.localUserStore.setMatrixAccessTokenExpireDate(expireDate);
        }

        // Note: we ignore the device ID returned by the server. We use the one we generated.
        // This will be required in the future when we switch to a Native OpenID Matrix client.
        return {
            matrixUserId: user_id,
            accessToken: access_token,
            refreshToken: refresh_token ?? null,
        };
    }

    private generateDeviceId(): string {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 10; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
