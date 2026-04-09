import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureExceptionMock = vi.fn();

vi.mock("@sentry/node", () => ({
    captureException: captureExceptionMock,
}));

describe("TelemetryService", () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.clearAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("should send telemetry data as JSON", async () => {
        const { TelemetryService } = await import("../src/Services/TelemetryService");
        const telemetryService = new TelemetryService("https://stats.example.com", {
            version: "1.2.3",
            playUrl: "https://play.example.com",
            adminUrl: "https://admin.example.com",
            securityEmail: "security@example.com",
        });

        fetchMock.mockResolvedValue(
            new Response(null, {
                status: 201,
            })
        );

        await telemetryService.startTelemetry();

        expect(fetchMock).toHaveBeenCalledWith(
            "https://stats.example.com/api/telemetry",
            expect.objectContaining({
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    version: "1.2.3",
                    play_url: "https://play.example.com",
                    admin_url: "https://admin.example.com",
                    security_email: "security@example.com",
                }),
            })
        );
        expect(captureExceptionMock).not.toHaveBeenCalled();
    });

    it("should capture non-201 responses without throwing", async () => {
        const { TelemetryService } = await import("../src/Services/TelemetryService");
        const telemetryService = new TelemetryService("https://stats.example.com", {
            version: "1.2.3",
            playUrl: "https://play.example.com",
        });

        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ accepted: true }), {
                status: 202,
                headers: {
                    "content-type": "application/json",
                },
            })
        );

        await expect(telemetryService.startTelemetry()).resolves.toBeUndefined();
        expect(captureExceptionMock).toHaveBeenCalledWith('Failed to send telemetry data: 202 {"accepted":true}');
    });

    it("should capture HttpError failures without throwing", async () => {
        const { TelemetryService } = await import("../src/Services/TelemetryService");
        const telemetryService = new TelemetryService("https://stats.example.com", {
            version: "1.2.3",
            playUrl: "https://play.example.com",
        });

        fetchMock.mockResolvedValue(
            new Response("Service unavailable", {
                status: 503,
                statusText: "Service Unavailable",
            })
        );

        await expect(telemetryService.startTelemetry()).resolves.toBeUndefined();
        expect(captureExceptionMock).toHaveBeenCalledWith("Failed to send telemetry data: 503 Service unavailable");
    });
});
