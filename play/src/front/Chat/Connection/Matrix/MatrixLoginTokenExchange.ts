// This module runs on the startup path, before the chat opens: it must never import matrix-js-sdk, which is only
// loaded once the chat needs it.
import { z } from "zod";
import { localUserStore } from "../../../Connection/LocalUserStore";

export class InvalidLoginTokenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidLoginTokenError";
    }
}

const LoginResponse = z.object({
    user_id: z.string(),
    access_token: z.string(),
    device_id: z.string(),
    refresh_token: z.string().optional(),
    expires_in_ms: z.number().optional(),
});

const ATTEMPT_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [1_000, 3_000, 10_000];

/**
 * Swaps the login token Synapse's SSO flow hands the page for a Matrix session, and stores that session.
 *
 * The token is single use and lives two minutes, so it is spent as soon as the page lands with it, and it is never
 * stored: a stored token outlived its two minutes, was shared by every tab and replayed by each of them.
 *
 * When the homeserver refuses the token (spent, expired or unknown: Synapse says "Invalid login token" in every case),
 * this throws an InvalidLoginTokenError straight away. When it does not answer, or cannot right now (rate limit,
 * server error), the token was most likely never spent, so the exchange is retried a few times first.
 */
export async function exchangeMatrixLoginToken(
    matrixServerUrl: string,
    loginToken: string,
    retryDelaysMs = RETRY_DELAYS_MS,
): Promise<void> {
    try {
        await login(matrixServerUrl, loginToken);
    } catch (e) {
        const [retryDelayMs, ...nextRetryDelaysMs] = retryDelaysMs;
        if (e instanceof InvalidLoginTokenError || retryDelayMs === undefined) {
            throw e;
        }
        console.warn("Unable to exchange the Matrix login token, retrying", e);
        await new Promise<void>((resolve) => {
            setTimeout(resolve, retryDelayMs);
        });
        await exchangeMatrixLoginToken(matrixServerUrl, loginToken, nextRetryDelaysMs);
    }
}

async function login(matrixServerUrl: string, loginToken: string): Promise<void> {
    const response = await fetch(`${matrixServerUrl.replace(/\/$/, "")}/_matrix/client/v3/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: "m.login.token",
            token: loginToken,
            initial_device_display_name: "WorkAdventure",
        }),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new InvalidLoginTokenError(`Invalid login token (HTTP ${response.status})`);
    }
    if (!response.ok) {
        throw new Error(`The Matrix login failed with HTTP ${response.status}`);
    }
    const { user_id, access_token, device_id, refresh_token, expires_in_ms } = LoginResponse.parse(
        await response.json(),
    );

    // The stores belong to the previous Matrix user: MatrixClientWrapper must clear them before it connects. This has
    // to be decided now, before the new user id overwrites the old one, and must survive a reload.
    if (localUserStore.getMatrixUserId() !== user_id) {
        localUserStore.setMatrixStoresNeedClearing(true);
    }
    localUserStore.setMatrixUserId(user_id);
    localUserStore.setMatrixAccessToken(access_token);
    localUserStore.setMatrixRefreshToken(refresh_token ?? null);
    localUserStore.setMatrixDeviceId(device_id, user_id);
    if (expires_in_ms !== undefined) {
        localUserStore.setMatrixAccessTokenExpireDate(new Date(Date.now() + expires_in_ms));
    }
}
