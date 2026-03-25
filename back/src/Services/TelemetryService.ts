import Debug from "debug";
import * as Sentry from "@sentry/node";
import { assertResponseOk, HttpError } from "@workadventure/shared-utils";
import { ADMIN_API_URL, PLAY_URL, SECURITY_EMAIL, TELEMETRY_URL } from "../Enum/EnvironmentVariable";
import { version } from "./version";

const debug = Debug("telemetry");

export interface TelemetryPayload {
    version: string;
    playUrl: string;
    adminUrl?: string;
    securityEmail?: string;
}

export class TelemetryService {
    constructor(
        private readonly url: string,
        private readonly telemetryPayload: TelemetryPayload = {
            version,
            playUrl: PLAY_URL,
            adminUrl: ADMIN_API_URL,
            securityEmail: SECURITY_EMAIL,
        }
    ) {}

    private async sendTelemetryInfo(): Promise<void> {
        try {
            const url = new URL("/api/telemetry", this.url);
            const response = await assertResponseOk(
                await fetch(url.toString(), {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        version: this.telemetryPayload.version,
                        play_url: this.telemetryPayload.playUrl,
                        admin_url: this.telemetryPayload.adminUrl,
                        security_email: this.telemetryPayload.securityEmail,
                    }),
                })
            );
            if (response.status !== 201) {
                const responseBody = await response.clone().text();
                console.error("Failed to send telemetry data:", response.status, responseBody);
                Sentry.captureException(
                    `Failed to send telemetry data: ${response.status}${responseBody ? ` ${responseBody}` : ""}`
                );
                return;
            }
            debug("Telemetry data sent.");
        } catch (error) {
            if (error instanceof HttpError) {
                console.error("Failed to send telemetry data:", error.status, error.body ?? error);
                Sentry.captureException(
                    `Failed to send telemetry data: ${error.status}${error.body ? ` ${error.body}` : ""}`
                );
                return;
            }
            console.error("Failed to send telemetry data:", error);
            Sentry.captureException(`Failed to send telemetry data: ${JSON.stringify(error)}`);
        }
    }

    public async startTelemetry(): Promise<void> {
        if (this.telemetryPayload.playUrl.includes("localhost")) {
            // Do not track development installs
            debug("Telemetry disabled, this is a development install.");
            return;
        }

        // Schedule a daily request to track the installation
        const delay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        setInterval(() => {
            this.sendTelemetryInfo().catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
        }, delay);

        // Track the installation immediately
        await this.sendTelemetryInfo();
    }
}

export const telemetryService = new TelemetryService(TELEMETRY_URL);
