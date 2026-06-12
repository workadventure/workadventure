import { describe, expect, it } from "vitest";
import {
    LOUD_ENVIRONMENT_COOLDOWN_MS,
    LOUD_ENVIRONMENT_REQUIRED_LOUD_SAMPLE_COUNT,
    LOUD_ENVIRONMENT_RMS_THRESHOLD,
    LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT,
    LoudEnvironmentDetector,
} from "./LoudEnvironmentDetection";

function feedSamples(
    detector: LoudEnvironmentDetector,
    rmsValues: number[],
    options: { startAt?: number; enabled?: boolean; contextKey?: string } = {},
): boolean[] {
    const startAt = options.startAt ?? 0;
    const enabled = options.enabled ?? true;
    const contextKey = options.contextKey ?? "mic-1";

    return rmsValues.map((rms, index) =>
        detector.processSample({
            rms,
            timestamp: startAt + index * 100,
            enabled,
            contextKey,
        }),
    );
}

describe("LoudEnvironmentDetector", () => {
    it("does not trigger when samples stay below the loudness threshold", () => {
        const detector = new LoudEnvironmentDetector();

        const results = feedSamples(
            detector,
            Array.from({ length: LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT }, () => LOUD_ENVIRONMENT_RMS_THRESHOLD - 0.01),
        );

        expect(results).not.toContain(true);
    });

    it("ignores transient loud spikes", () => {
        const detector = new LoudEnvironmentDetector();
        const rmsValues = [
            ...Array.from({ length: LOUD_ENVIRONMENT_REQUIRED_LOUD_SAMPLE_COUNT - 1 }, () => 0.08),
            ...Array.from(
                { length: LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT - LOUD_ENVIRONMENT_REQUIRED_LOUD_SAMPLE_COUNT + 1 },
                () => 0.01,
            ),
        ];

        const results = feedSamples(detector, rmsValues);

        expect(results).not.toContain(true);
    });

    it("triggers on sustained loud input", () => {
        const detector = new LoudEnvironmentDetector();

        const results = feedSamples(
            detector,
            Array.from({ length: LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT }, () => 0.08),
        );

        expect(results).toContain(true);
    });

    it("does not collect samples while detection is disabled", () => {
        const detector = new LoudEnvironmentDetector();

        feedSamples(
            detector,
            Array.from({ length: LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT }, () => 0.08),
            { enabled: false },
        );

        const results = feedSamples(
            detector,
            Array.from({ length: LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT - 1 }, () => 0.08),
            { startAt: 10_000 },
        );

        expect(results).not.toContain(true);
    });

    it("enforces the cooldown after a warning", () => {
        const detector = new LoudEnvironmentDetector();

        expect(
            feedSamples(
                detector,
                Array.from({ length: LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT }, () => 0.08),
            ),
        ).toContain(true);

        const results = feedSamples(
            detector,
            Array.from({ length: LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT }, () => 0.08),
            { startAt: LOUD_ENVIRONMENT_COOLDOWN_MS - 1 },
        );

        expect(results).not.toContain(true);
    });

    it("resets the window and cooldown when the detection context changes", () => {
        const detector = new LoudEnvironmentDetector();

        expect(
            feedSamples(
                detector,
                Array.from({ length: LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT }, () => 0.08),
                { contextKey: "mic-1" },
            ),
        ).toContain(true);

        const results = feedSamples(
            detector,
            Array.from({ length: LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT }, () => 0.08),
            { contextKey: "mic-2", startAt: 1_000 },
        );

        expect(results).toContain(true);
    });
});
