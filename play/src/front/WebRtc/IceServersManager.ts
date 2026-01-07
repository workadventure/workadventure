import * as Sentry from "@sentry/svelte";
import type { IceServer } from "@workadventure/messages";
import type { RoomConnection } from "../Connection/RoomConnection";
import { TURN_CREDENTIALS_RENEWAL_TIME } from "../Enum/EnvironmentVariable";

const CREDENTIALS_RETRY_BACKOFF = [30_000, 60_000, 120_000, 300_000]; // 30s, 1m, 2m, 5m

export type IceServersConfig = IceServer[];

class IceServersManager {
    private iceServersConfigPromise: Promise<IceServer[]> | undefined;
    private renewalTimer: ReturnType<typeof setTimeout> | undefined;
    private retryCount = 0;
    private roomConnection: RoomConnection | undefined;

    init(roomConnection: RoomConnection, signal?: AbortSignal, iceServersConfig?: IceServer[]) {
        if (this.renewalTimer) {
            clearTimeout(this.renewalTimer);
            this.renewalTimer = undefined;
        }

        this.roomConnection = roomConnection;

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

        if (iceServersConfig) {
            const cleanedConfig = this.cleanIceServersConfig(iceServersConfig);
            this.iceServersConfigPromise = Promise.resolve(cleanedConfig);

            // Start the renewal timer
            this.scheduleRenewal(TURN_CREDENTIALS_RENEWAL_TIME);
        } else {
            this.renewNow().catch((e) => {
                console.error("Failed to obtain initial ICE servers configuration:", e);
                Sentry.captureException(e);
            });
        }
    }

    public finalize() {
        if (this.renewalTimer) {
            clearTimeout(this.renewalTimer);
            this.renewalTimer = undefined;
        }
        this.iceServersConfigPromise = undefined;
        this.roomConnection = undefined;
        this.retryCount = 0;
    }

    public async getIceServersConfig(): Promise<IceServersConfig> {
        if (!this.iceServersConfigPromise) {
            return this.renewNow();
        }
        return this.iceServersConfigPromise;
    }

    private async renewNow(): Promise<IceServersConfig> {
        // If a query is already in progress, wait for it instead of making a new one
        if (this.iceServersConfigPromise) {
            return this.iceServersConfigPromise;
        }

        if (!this.roomConnection) {
            throw new Error("TurnCredentialsManager not initialized with a RoomConnection");
        }

        // Store the promise to prevent simultaneous queries
        this.iceServersConfigPromise = (async () => {
            try {
                const answer = await this.roomConnection!.queryIceServers();
                const config = this.cleanIceServersConfig(answer.iceServers);
                this.retryCount = 0;
                this.scheduleRenewal(TURN_CREDENTIALS_RENEWAL_TIME);
                return config;
            } catch (e) {
                console.error("Error while renewing TURN credentials:", e);
                Sentry.captureException(e);
                const delay =
                    CREDENTIALS_RETRY_BACKOFF[Math.min(this.retryCount, CREDENTIALS_RETRY_BACKOFF.length - 1)];
                this.retryCount++;
                this.scheduleRenewal(delay);
                // Clear the promise on error so a retry can be attempted
                this.iceServersConfigPromise = undefined;
                throw e;
            }
        })();

        return this.iceServersConfigPromise;
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
    private cleanIceServersConfig(config: IceServer[]): IceServer[] {
        if (!config) return config;
        return config.map((server) => this.removeUndefinedKeys(server));
    }
}

export const iceServersManager = new IceServersManager();
