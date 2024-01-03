import { ClientEvent, createClient, IndexedDBCryptoStore, IndexedDBStore, MatrixClient } from "matrix-js-sdk";
import { logger } from "matrix-js-sdk/src/logger";
import { Deferred } from "ts-deferred";
import { failure, Result, success } from "@workadventure/map-editor";
//import Olm from "olm";
import { localUserStore } from "../Connection/LocalUserStore";

type MatrixClientResult = Result<
    MatrixClient,
    | {
          type: "no-matrix-server";
      }
    | {
          type: "no-matrix-credentials";
      }
    | {
          type: "error";
          error: Error;
      }
>;

const matrixClient = new Deferred<MatrixClientResult>();
let matrixLoginToken: string | undefined;

/**
 * Must be called BEFORE setMatrixServerUrl
 */
export function setMatrixLoginToken(_matrixLoginToken: string) {
    matrixLoginToken = _matrixLoginToken;
}

/**
 * Sets the Matrix server URL. This initializes the Matrix client.
 * We also pass the userUuid so that we can store the device ID in the local storage.
 */
export function setMatrixServerDetails(url: string, userUuid: string): void {
    instantiateMatrixClient(url, userUuid).catch((err) => {
        matrixClient.reject(err);
    });
}

async function instantiateMatrixClient(url: string, userUuid: string): Promise<void> {
    logger.setLevel(logger.levels.ERROR);
    //window.Olm = Olm;

    // First step, let's ensure we have a device ID. If not, let's create one and store it.
    let deviceId = localUserStore.getMatrixDeviceId(userUuid);
    if (deviceId === null) {
        deviceId = generateDeviceId();
        localUserStore.setMatrixDeviceId(deviceId, userUuid);
    }

    let accessToken = localUserStore.getMatrixAccessToken();
    let refreshToken = localUserStore.getMatrixRefreshToken();
    let userId = localUserStore.getMatrixUserId();

    if (accessToken === null && refreshToken === null && matrixLoginToken === undefined) {
        // No access token, no refresh token, no login token. We can't connect.
        matrixClient.resolve(
            failure({
                type: "no-matrix-credentials",
            })
        );
        return;
    }

    let oldUserId: string | null = null;

    // If we have a login token, we need to convert it into an access token.
    if (matrixLoginToken !== undefined) {
        oldUserId = localUserStore.getMatrixUserId();
        const response = await connectViaLoginToken(url, matrixLoginToken, deviceId);
        // eslint-disable-next-line require-atomic-updates
        accessToken = response.accessToken;
        refreshToken = response.refreshToken ?? null;
        userId = response.userId;
    }

    if (!accessToken) {
        matrixClient.resolve(
            failure({
                type: "error",
                error: new Error("No access token"),
            })
        );
        return;
    }

    // Let's ensure we have a fresh access token.
    /*const now = new Date();
    const expireDate = localUserStore.getMatrixAccessTokenExpireDate();
    if (expireDate !== null && expireDate < now) {
        if (!refreshToken) {
            matrixClient.reject(new Error("Access token expired and no refresh token available. This should never happen."));
            return;
        }

        // Access token is expired. Let's refresh it.
        const client = createClient({
            baseUrl: url,
            deviceId,
        });
        const response = await client.refreshToken(refreshToken);
        accessToken = response.access_token;
        refreshToken = response.refresh_token ?? null;
        const expireDate = new Date();
        // Add response.expires_in milliseconds to the current date.
        expireDate.setMilliseconds(expireDate.getMilliseconds() + response.expires_in_ms);

        localUserStore.setMatrixAccessToken(accessToken);
        localUserStore.setMatrixRefreshToken(refreshToken);
        localUserStore.setMatrixAccessTokenExpireDate(expireDate);
    }*/

    const indexedDBStore = new IndexedDBStore({
        indexedDB: globalThis.indexedDB,
        localStorage: globalThis.localStorage,
        dbName: "workadventure-matrix",
    });

    // Now, let's instantiate the Matrix client.
    const client = createClient({
        baseUrl: url,
        deviceId,
        userId: userId ?? undefined,
        accessToken,
        refreshToken: refreshToken ?? undefined,
        tokenRefreshFunction: async (refreshToken: string) => {
            const response = await client.refreshToken(refreshToken);
            accessToken = response.access_token;
            refreshToken = response.refresh_token ?? null;
            const expireDate = new Date();
            // Add response.expires_in milliseconds to the current date.
            expireDate.setMilliseconds(expireDate.getMilliseconds() + response.expires_in_ms);

            localUserStore.setMatrixAccessToken(accessToken);
            localUserStore.setMatrixRefreshToken(refreshToken);
            localUserStore.setMatrixAccessTokenExpireDate(expireDate);
            return {
                accessToken,
                refreshToken: refreshToken ?? undefined,
            };
        },
        store: indexedDBStore,
        cryptoStore: new IndexedDBCryptoStore(
            globalThis.indexedDB,
            "crypto-store-" + url + "-" + userId + "-" + deviceId
        ),
    });

    if (oldUserId !== null && oldUserId !== userId) {
        // We have a new user ID. Let's delete the old stores.
        await client.clearStores();
    }

    await indexedDBStore.startup();
    //await client.initCrypto();
    await client.initRustCrypto();
    await client.startClient();

    let prepared = false;

    client.on(ClientEvent.Sync, (state, prevState, res) => {
        if (state === "PREPARED") {
            prepared = true;
            matrixClient.resolve(success(client));
        } else if (state === "ERROR") {
            if (!prepared) {
                // The error occurs before the client is prepared. There is an initial sync issue, let's trigger an error.
                console.error("Initial sync error with Matrix server", res);
                matrixClient.resolve(
                    failure({
                        type: "error",
                        error: new Error("Initial sync error"),
                    })
                );
            } else {
                console.error("Sync error with Matrix", res);
            }
        }
    });
}

export function noMatrixServerUrl(): void {
    matrixClient.resolve(
        failure({
            type: "no-matrix-server",
        })
    );
}

/**
 * Calls the m.login.token endpoint to convert a Matrix token into an authentication and refresh token.
 * Stores the result in the local storage.
 */
async function connectViaLoginToken(
    matrixServerUrl: string,
    loginToken: string,
    deviceId: string
): Promise<{
    userId: string;
    accessToken: string;
    refreshToken: string | undefined;
}> {
    const client = createClient({
        baseUrl: matrixServerUrl,
    });

    //const response = await client.loginWithToken(loginToken);
    const response = await client.login("m.login.token", {
        token: loginToken,
        device_id: deviceId,
        initial_device_display_name: "WorkAdventure",
    });

    localUserStore.setMatrixUserId(response.user_id);
    localUserStore.setMatrixAccessToken(response.access_token);
    localUserStore.setMatrixRefreshToken(response.refresh_token ?? null);
    if (response.expires_in_ms !== undefined) {
        const expireDate = new Date();
        // Add response.expires_in milliseconds to the current date.
        expireDate.setMilliseconds(expireDate.getMilliseconds() + response.expires_in_ms);
        localUserStore.setMatrixAccessTokenExpireDate(expireDate);
    }

    // Note: we ignore the device ID returned by the server. We use the one we generated.
    // This will be required in the future when we switch to a Native OpenID Matrix client.

    return {
        userId: response.user_id,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
    };
}

/**
 * Generates a new device ID and returns it.
 * A device ID is a random string containing 8 upper or lower case letters or numbers.
 *
 * In the future (when we switch to a Native OpenID Matrix client), we will need to generate this device ID and not rely
 * on a device ID generated by the Matrix server.
 */
function generateDeviceId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    //const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Returns a promise that resolves to a MatrixClientResult instance.
 * This promise will resolve only when a Matrix server URL is returned by the "me" endpoint.
 */
export async function getMatrixClient(): Promise<MatrixClientResult> {
    return matrixClient.promise;
}
