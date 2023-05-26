import axios, { AxiosResponse } from "axios";
import Debug from "debug";
import * as Sentry from "@sentry/node";
import { ADMIN_API_URL, PLAY_URL, SECURITY_EMAIL, TELEMETRY_URL } from "../Enum/EnvironmentVariable";
import { version } from "./version";

const debug = Debug("telemetry");

class TelemetryService {
    constructor(private readonly url: string) {}

    private async sendTelemetryInfo(): Promise<void> {
        try {
            const url = new URL("/api/telemetry", this.url);
            const response: AxiosResponse = await axios.post(url.toString(), {
                version: version,
                play_url: PLAY_URL,
                admin_url: ADMIN_API_URL,
                security_email: SECURITY_EMAIL,
            });
            if (response.status !== 201) {
                console.error("Failed to send telemetry data:", response.status, response.data);
                Sentry.captureException(
                    `Failed to send telemetry data:  ${response.status} ${JSON.stringify(response.data)}`
                );
            }
            debug("Telemetry data sent.");
        } catch (error) {
            console.error("Failed to send telemetry data:", error);
            Sentry.captureException(`Failed to send telemetry data: ${JSON.stringify(error)}`);
        }
    }

    public async startTelemetry(): Promise<void> {
        if (PLAY_URL.includes("localhost")) {
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
