import { describe, it, expect } from "vitest";
import { CheckStatus, type CheckInfo } from "livekit-client";
import {
    classifyLivekitChecks,
    LivekitConnectionStatus,
    type LivekitCheckResults,
} from "../../../src/front/Livekit/utils/LivekitConnectionChecker";

function check(status: CheckStatus): CheckInfo {
    // `name`/`description` are irrelevant to the classification (that's the whole point of the fix:
    // we must not rely on CheckInfo.name), so we leave them empty.
    return { name: "", description: "", status, logs: [] };
}

function results(overrides: Partial<Record<keyof LivekitCheckResults, CheckStatus>> = {}): LivekitCheckResults {
    const statuses: Record<keyof LivekitCheckResults, CheckStatus> = {
        websocket: CheckStatus.SUCCESS,
        webRTC: CheckStatus.SUCCESS,
        turn: CheckStatus.SUCCESS,
        publishAudio: CheckStatus.SUCCESS,
        publishVideo: CheckStatus.SUCCESS,
        ...overrides,
    };
    return {
        websocket: check(statuses.websocket),
        webRTC: check(statuses.webRTC),
        turn: check(statuses.turn),
        publishAudio: check(statuses.publishAudio),
        publishVideo: check(statuses.publishVideo),
    };
}

describe("classifyLivekitChecks", () => {
    it("returns Success when every check passes", () => {
        const summary = classifyLivekitChecks(results());
        expect(summary.status).toBe(LivekitConnectionStatus.Success);
        expect(summary.failedChecks).toEqual([]);
    });

    it("returns Critical when the signaling websocket fails", () => {
        const summary = classifyLivekitChecks(results({ websocket: CheckStatus.FAILED }));
        expect(summary.status).toBe(LivekitConnectionStatus.Critical);
        expect(summary.failedChecks).toContain("websocket");
    });

    it("prioritizes Critical over a degraded media path", () => {
        const summary = classifyLivekitChecks(results({ websocket: CheckStatus.FAILED, turn: CheckStatus.FAILED }));
        expect(summary.status).toBe(LivekitConnectionStatus.Critical);
        expect(summary.failedChecks).toEqual(expect.arrayContaining(["websocket", "turn"]));
    });

    it.each(["webRTC", "turn", "publishAudio", "publishVideo"] as const)(
        "returns Warning when only %s fails",
        (failing) => {
            const overrides: Partial<Record<keyof LivekitCheckResults, CheckStatus>> = {
                [failing]: CheckStatus.FAILED,
            };
            const summary = classifyLivekitChecks(results(overrides));
            expect(summary.status).toBe(LivekitConnectionStatus.Warning);
            expect(summary.failedChecks).toEqual([failing]);
        },
    );

    it("reports our own stable labels, never the minifiable CheckInfo.name", () => {
        const summary = classifyLivekitChecks(results({ turn: CheckStatus.FAILED }));
        // "turn", not livekit-client's class name "TURNCheck".
        expect(summary.failedChecks).toEqual(["turn"]);
    });

    it("treats non-FAILED statuses (e.g. SKIPPED) as not failing", () => {
        const summary = classifyLivekitChecks(results({ turn: CheckStatus.SKIPPED }));
        expect(summary.status).toBe(LivekitConnectionStatus.Success);
        expect(summary.failedChecks).toEqual([]);
    });
});
