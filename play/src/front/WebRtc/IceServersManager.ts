import * as Sentry from "@sentry/svelte";
import type { IceServersAnswer } from "@workadventure/messages";
import type { RoomConnection } from "../Connection/RoomConnection";

const CREDENTIALS_RENEWAL_TIME = 3 * 60 * 60 * 1000; // 3h
const CREDENTIALS_RETRY_BACKOFF = [30_000, 60_000, 120_000, 300_000]; // 30s, 1m, 2m, 5m

export type IceServersConfig = IceServersAnswer["iceServers"];

class IceServersManager {
    private iceServersConfig: IceServersAnswer["iceServers"] | undefined;
    private renewalTimer: ReturnType<typeof setTimeout> | undefined;
    private retryCount = 0;
    private roomConnection: RoomConnection | undefined;

    init(roomConnection: RoomConnection, signal?: AbortSignal, iceServersConfig?: IceServersConfig) {
        if (this.renewalTimer) {
            clearTimeout(this.renewalTimer);
            this.renewalTimer = undefined;
        }

        this.roomConnection = roomConnection;

        if (iceServersConfig) {
            this.iceServersConfig = this.cleanIceServersConfig(iceServersConfig);
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

    public getCurrentIceServersConfig(): IceServersConfig {
        if (!this.iceServersConfig) {
            throw new Error("ICE servers configuration is not available yet.");
        }
        return this.iceServersConfig;
    }

    public async ensureIceServersConfig(): Promise<IceServersConfig> {
        if (this.iceServersConfig) return this.iceServersConfig;
        await this.renewNow();
        if (!this.iceServersConfig) {
            throw new Error("Failed to obtain ICE servers configuration.");
        }
        return this.iceServersConfig;
    }

    private async renewNow(): Promise<void> {
        if (!this.roomConnection) {
            throw new Error("TurnCredentialsManager not initialized with a RoomConnection");
        }
        try {
            const answer = await this.roomConnection.queryIceServers();
            this.iceServersConfig = answer.iceServers;
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

    /**
     * Remove keys with undefined values from an object
     */
    private removeUndefinedKeys<T>(obj: T): T {
        const result = {} as T;
        for (const key in obj) {
            if (obj[key] !== undefined) {
                result[key] = obj[key];
            }
        }
        return result;
    }

    /**
     * Clean ICE servers config by removing undefined values
     */
    private cleanIceServersConfig(config: IceServersConfig): IceServersConfig {
        if (!config) return config;
        return config.map((server) => this.removeUndefinedKeys(server));
    }
}

export const iceServersManager = new IceServersManager();
