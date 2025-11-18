import * as Sentry from "@sentry/svelte";
import type { RoomConnection } from "../Connection/RoomConnection";

const CREDENTIALS_RENEWAL_TIME = 3 * 60 * 60 * 1000; // 3h
const CREDENTIALS_RETRY_BACKOFF = [30_000, 60_000, 120_000, 300_000]; // 30s, 1m, 2m, 5m

export type TurnCredentials = {
    webRtcUser?: string;
    webRtcPassword?: string;
};

class TurnCredentialsManager {
    private creds: TurnCredentials = {};
    private renewalTimer: ReturnType<typeof setTimeout> | undefined;
    private retryCount = 0;
    private roomConnection: RoomConnection | undefined;

    init(roomConnection: RoomConnection, signal?: AbortSignal, creds?: TurnCredentials) {
        if (this.renewalTimer) {
            clearTimeout(this.renewalTimer);
            this.renewalTimer = undefined;
        }

        this.roomConnection = roomConnection;

        if (creds) {
            this.creds = { ...creds };
        }

        if (signal) {
            signal.addEventListener(
                "abort",
                () => {
                    if (this.renewalTimer) {
                        clearTimeout(this.renewalTimer);
                        this.renewalTimer = undefined;
                    }
                },
                { once: true }
            );
        }

        // Start the renewal timer for 3 hours
        this.scheduleRenewal(CREDENTIALS_RENEWAL_TIME);
    }

    public getCurrentCredentials(): TurnCredentials {
        return { ...this.creds };
    }

    public async ensureCredentials(): Promise<TurnCredentials> {
        if (this.creds.webRtcUser && this.creds.webRtcPassword) return { ...this.creds };
        await this.renewNow();
        return { ...this.creds };
    }

    private async renewNow(): Promise<void> {
        if (!this.roomConnection) {
            throw new Error("TurnCredentialsManager not initialized with a RoomConnection");
        }
        try {
            const answer = await this.roomConnection.queryTurnCredentials();
            this.creds.webRtcUser = answer.webRtcUser ?? undefined;
            this.creds.webRtcPassword = answer.webRtcPassword ?? undefined;
            this.retryCount = 0;
            this.scheduleRenewal(CREDENTIALS_RENEWAL_TIME);
        } catch (e) {
            console.error("Error while renewing TURN credentials:", e);
            Sentry.captureException(e);
            const delay = CREDENTIALS_RETRY_BACKOFF[Math.min(this.retryCount, CREDENTIALS_RETRY_BACKOFF.length - 1)];
            this.retryCount++;
            this.scheduleRenewal(delay);
        }
    }

    private scheduleRenewal(delay: number) {
        if (this.renewalTimer) clearTimeout(this.renewalTimer);
        this.renewalTimer = setTimeout(() => {
            this.renewNow().catch((e) => {
                console.error("Failed to renew TURN credentials:", e);
                Sentry.captureException(e);
            });
        }, delay);
    }
}

export const turnCredentialsManager = new TurnCredentialsManager();
