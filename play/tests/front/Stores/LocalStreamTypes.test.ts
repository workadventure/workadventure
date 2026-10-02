import { describe, expect, it } from "vitest";
import {
    composeLocalStreamValue,
    getLocalTrackFromStreamValue,
    type LocalStreamStoreValue,
} from "../../../src/front/Stores/LocalStreamTypes";

function createMediaStreamTrack(kind: "audio" | "video", id: string): MediaStreamTrack {
    return {
        id,
        kind,
        readyState: "live",
        stop: () => undefined,
    } as MediaStreamTrack;
}

describe("LocalStreamTypes", () => {
    it("removes a stale video track when the source stream instance is reused", () => {
        const audioTrack = createMediaStreamTrack("audio", "audio");
        const videoTrack = createMediaStreamTrack("video", "video");
        const sourceStream = new MediaStream([videoTrack, audioTrack]);
        const firstRawValue: LocalStreamStoreValue = {
            type: "success",
            stream: sourceStream,
        };

        const processedAudioTrackValue = getLocalTrackFromStreamValue(firstRawValue, "audio");
        const firstVideoTrackValue = getLocalTrackFromStreamValue(firstRawValue, "video");

        const firstComposedValue = composeLocalStreamValue(processedAudioTrackValue, firstVideoTrackValue, true);

        expect(firstComposedValue.type).toBe("success");
        expect(firstComposedValue.type === "success" ? firstComposedValue.stream?.getAudioTracks() : []).toEqual([
            audioTrack,
        ]);
        expect(firstComposedValue.type === "success" ? firstComposedValue.stream?.getVideoTracks() : []).toEqual([
            videoTrack,
        ]);

        sourceStream.removeTrack(videoTrack);

        const nextRawValue: LocalStreamStoreValue = {
            type: "success",
            stream: sourceStream,
        };
        const nextVideoTrackValue = getLocalTrackFromStreamValue(nextRawValue, "video");
        const nextComposedValue = composeLocalStreamValue(processedAudioTrackValue, nextVideoTrackValue, true);

        expect(nextComposedValue.type).toBe("success");
        expect(nextComposedValue.type === "success" ? nextComposedValue.stream?.getAudioTracks() : []).toEqual([
            audioTrack,
        ]);
        expect(nextComposedValue.type === "success" ? nextComposedValue.stream?.getVideoTracks() : []).toEqual([]);
    });

    it("keeps an empty stream when an existing source stream has no tracks", () => {
        const composedValue = composeLocalStreamValue(
            { type: "success", track: undefined },
            { type: "success", track: undefined },
            true,
        );

        expect(composedValue.type).toBe("success");
        expect(composedValue.type === "success" ? composedValue.stream?.getTracks() : undefined).toEqual([]);
    });

    it("uses undefined when no source stream exists", () => {
        const composedValue = composeLocalStreamValue(
            { type: "success", track: undefined },
            { type: "success", track: undefined },
            false,
        );

        expect(composedValue.type).toBe("success");
        expect(composedValue.type === "success" ? composedValue.stream : undefined).toBeUndefined();
    });
});
