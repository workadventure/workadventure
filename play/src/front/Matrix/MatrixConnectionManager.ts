import { IndexedDBStore, MatrixClient, createClient } from "matrix-js-sdk";
import { logger } from "matrix-js-sdk/src/logger";
import { Deferred } from "ts-deferred";
import { localUserStore } from "../Connection/LocalUserStore";

const matrixClient = new Deferred<MatrixClient>();
let matrixLoginToken: string | undefined;

const indexedDBStore = new IndexedDBStore({
    indexedDB: globalThis.indexedDB,
    localStorage: globalThis.localStorage,
    dbName: "workadventure-matrix",
});

/**
 * Must be called BEFORE setMatrixServerUrl
 */
export function setMatrixLoginToken(_matrixLoginToken: string) {
    matrixLoginToken = _matrixLoginToken;
}

export function setMatrixServerUrl(url: string): void {
    instantiateMatrixClient(url).catch((err) => {
        matrixClient.reject(err);
    });
}

async function instantiateMatrixClient(url: string): Promise<void> {
    logger.setLevel(logger.levels.ERROR);
    await indexedDBStore.startup();

    // First step, let's ensure we have a device ID. If not, let's create one and store it.
    let deviceId = localUserStore.getMatrixDeviceId();
    if (deviceId === null) {
        deviceId = generateDeviceId();
        localUserStore.setMatrixDeviceId(deviceId);
    }

    let accessToken = localUserStore.getMatrixAccessToken();
    let refreshToken = localUserStore.getMatrixRefreshToken();
    let userId = localUserStore.getMatrixUserId();

    if (accessToken === null && refreshToken === null && matrixLoginToken === undefined) {
        // No access token, no refresh token, no login token. We can't connect.
        matrixClient.reject(new Error("No Matrix credentials available"));
        return;
    }

    // If we have a login token, we need to convert it into an access token.
    if (matrixLoginToken !== undefined) {
        const response = await connectViaLoginToken(url, matrixLoginToken, deviceId);
        // eslint-disable-next-line require-atomic-updates
        accessToken = response.accessToken;
        refreshToken = response.refreshToken ?? null;
        userId = response.userId;
        deviceId = response.deviceId;
    }

    if (!accessToken) {
        matrixClient.reject(new Error("No access token"));
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
    });

    matrixClient.resolve(client);
}

export function noMatrixServerUrl(): void {
    matrixClient.reject(new Error("No Matrix server URL available"));
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
    deviceId: string;
    refreshToken: string | undefined;
}> {
    const client = createClient({
        baseUrl: matrixServerUrl,
        deviceId,
    });

    const response = await client.loginWithToken(loginToken);

    localUserStore.setMatrixUserId(response.user_id);
    localUserStore.setMatrixAccessToken(response.access_token);
    localUserStore.setMatrixRefreshToken(response.refresh_token ?? null);
    if (response.expires_in_ms !== undefined) {
        const expireDate = new Date();
        // Add response.expires_in milliseconds to the current date.
        expireDate.setMilliseconds(expireDate.getMilliseconds() + response.expires_in_ms);
        localUserStore.setMatrixAccessTokenExpireDate(expireDate);
    }
    if (response.device_id !== deviceId) {
        // In case where the server would return a different device ID than the one we sent, we store it. (this happens!)
        localUserStore.setMatrixDeviceId(response.device_id);
    }
    return {
        userId: response.user_id,
        deviceId: response.device_id,
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
 * Returns a promise that resolves to a MatrixClient instance.
 * This promise will resolve only when a Matrix server URL is returned by the "me" endpoint.
 */
export async function getMatrixClient(): Promise<MatrixClient> {
    return matrixClient.promise;
}
