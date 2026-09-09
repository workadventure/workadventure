import { describe, expect, it } from "vitest";
import { get, writable } from "svelte/store";
import type { WebRtcSenderStats } from "../../../src/front/Components/Video/WebRtcStats";
import {
    aggregateSenderStats,
    describeEncoder,
    localEncoderStatsStore,
    registerLocalEncoderStats,
} from "../../../src/front/WebRtc/LocalEncoderStats";

function senderStats(overrides: Partial<WebRtcSenderStats> = {}): WebRtcSenderStats {
    return {
        source: "P2P",
        frameWidth: 640,
        frameHeight: 360,
        mimeType: "video/VP9",
        bandwidth: 100_000,
        fps: 25,
        qualityLimitationReason: "none",
        encoderImplementation: "libvpx",
        ...overrides,
    };
}

describe("describeEncoder", () => {
    it.each([
        ["libaom", "software"],
        ["SimulcastEncoderAdapter (libvpx, libvpx)", "software"],
        ["OpenH264", "software"],
        ["ExternalEncoder", "hardware"],
        ["VideoToolbox", "hardware"],
        ["SomethingNew", "unknown"],
    ] as const)("classifies %s as %s", (implementation, type) => {
        expect(describeEncoder(implementation)).toEqual({ name: implementation, type });
    });

    it("has no name without an implementation", () => {
        expect(describeEncoder(undefined)).toEqual({ name: "-", type: "unknown" });
    });
});

describe("aggregateSenderStats", () => {
    it("is empty without any encoder", () => {
        expect(aggregateSenderStats([])).toBeUndefined();
        expect(aggregateSenderStats([undefined])).toBeUndefined();
    });

    it("keeps a single encoder as is", () => {
        expect(aggregateSenderStats([senderStats()])).toEqual({ ...senderStats(), encoderCount: 1 });
    });

    it("reports the worst case over several encoders", () => {
        const aggregate = aggregateSenderStats([
            senderStats({ fps: 30, bandwidth: 100_000 }),
            undefined,
            senderStats({
                fps: 12,
                bandwidth: 50_000,
                frameWidth: 1280,
                frameHeight: 720,
                qualityLimitationReason: "cpu",
                mimeType: "video/AV1",
                encoderImplementation: "libaom",
            }),
            senderStats({ fps: 20, bandwidth: 25_000, qualityLimitationReason: "bandwidth" }),
        ]);
        expect(aggregate).toEqual({
            source: "P2P (3 encoders)",
            frameWidth: 1280,
            frameHeight: 720,
            mimeType: "video/AV1",
            bandwidth: 175_000,
            fps: 12,
            qualityLimitationReason: "cpu",
            encoderImplementation: "libaom",
            encoderCount: 3,
        });
    });
});

describe("localEncoderStatsStore", () => {
    it("aggregates the registered encoders and forgets the removed ones", () => {
        const first = writable<WebRtcSenderStats | undefined>(senderStats());
        const second = writable<WebRtcSenderStats | undefined>(undefined);

        expect(get(localEncoderStatsStore.video)).toBeUndefined();

        const unregisterFirst = registerLocalEncoderStats("video", first);
        const unregisterSecond = registerLocalEncoderStats("video", second);
        expect(get(localEncoderStatsStore.video)?.encoderCount).toBe(1);
        expect(get(localEncoderStatsStore.screenSharing)).toBeUndefined();

        second.set(senderStats({ qualityLimitationReason: "cpu" }));
        expect(get(localEncoderStatsStore.video)).toMatchObject({
            encoderCount: 2,
            qualityLimitationReason: "cpu",
        });

        unregisterSecond();
        expect(get(localEncoderStatsStore.video)).toMatchObject({
            encoderCount: 1,
            qualityLimitationReason: "none",
        });

        unregisterFirst();
        expect(get(localEncoderStatsStore.video)).toBeUndefined();
    });
});
