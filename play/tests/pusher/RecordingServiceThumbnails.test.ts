import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", async () => ({
    ...(await import("./mocks/pusherEnvironmentVariableMock")),
    LIVEKIT_RECORDING_S3_ENDPOINT: "https://s3.example.com",
    LIVEKIT_RECORDING_S3_CDN_ENDPOINT: "https://cdn.example.com",
    LIVEKIT_RECORDING_S3_ACCESS_KEY: "access-key",
    LIVEKIT_RECORDING_S3_SECRET_KEY: "secret-key",
    LIVEKIT_RECORDING_S3_BUCKET: "recordings",
    LIVEKIT_RECORDING_S3_REGION: "eu-west-1",
}));

const listedKeys: string[] = [];
const listPrefixes: (string | undefined)[] = [];

vi.mock("@aws-sdk/client-s3", () => ({
    S3Client: class {
        send(command: { input: { Prefix?: string } }) {
            listPrefixes.push(command.input.Prefix);
            return Promise.resolve({
                Contents: listedKeys
                    .filter((key) => !command.input.Prefix || key.startsWith(command.input.Prefix))
                    .map((key) => ({ Key: key, Size: 10 })),
                IsTruncated: false,
            });
        }
    },
    ListObjectsCommand: class {
        constructor(public readonly input: Record<string, unknown>) {}
    },
    GetObjectCommand: class {
        constructor(public readonly input: { Key: string }) {}
    },
    DeleteObjectCommand: class {
        constructor(public readonly input: { Key: string }) {}
    },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: (_client: unknown, command: { input: { Key: string } }) =>
        Promise.resolve(`signed:${command.input.Key}`),
}));

import RecordingService from "../../src/pusher/services/RecordingService";

const USER = "user-uuid";
const TIMESTAMP = "2026-09-11T10:00:00";

function thumbnailKey(sequence: number): string {
    return `${USER}/thumbnail-${TIMESTAMP}_${sequence}.jpg`;
}

function givenRecording(thumbnailCount: number): void {
    listedKeys.length = 0;
    listedKeys.push(`${USER}/recording-${TIMESTAMP}.mp4`);
    for (let sequence = 1; sequence <= thumbnailCount; sequence++) {
        listedKeys.push(thumbnailKey(sequence));
    }
}

describe("RecordingService thumbnails", () => {
    beforeEach(() => {
        listPrefixes.length = 0;
    });

    it("puts a single poster in the recordings list, whatever the recording length", async () => {
        givenRecording(360);

        const recordings = await RecordingService.getRecords(USER);

        expect(recordings).toHaveLength(1);
        // The first thumbnail is captured before anything is rendered, so the poster is the second one.
        expect(recordings[0].posterUrl).toBe(`signed:${thumbnailKey(2)}`);
        expect(JSON.stringify(recordings[0])).not.toContain(thumbnailKey(3));
    });

    it("leaves the poster empty when the recording has no thumbnail", async () => {
        listedKeys.length = 0;
        listedKeys.push(`${USER}/recording-${TIMESTAMP}.mp4`);

        const recordings = await RecordingService.getRecords(USER);

        expect(recordings).toHaveLength(1);
        expect(recordings[0].posterUrl).toBe("");
    });

    it("caps the hover thumbnails and spreads them over the whole recording", async () => {
        givenRecording(360);

        const urls = await RecordingService.getThumbnailUrls(USER, `recording-${TIMESTAMP}`);

        expect(urls).toHaveLength(15);
        // Evenly spaced from the second thumbnail (the first is the pre-roll frame) to the last one.
        expect(urls[0]).toBe(`signed:${thumbnailKey(2)}`);
        expect(urls[urls.length - 1]).toBe(`signed:${thumbnailKey(360)}`);
        expect(new Set(urls).size).toBe(urls.length);
    });

    it("returns every thumbnail of a short recording, in capture order", async () => {
        givenRecording(4);

        const urls = await RecordingService.getThumbnailUrls(USER, `recording-${TIMESTAMP}`);

        expect(urls).toEqual([2, 3, 4].map((sequence) => `signed:${thumbnailKey(sequence)}`));
    });

    it("orders thumbnails numerically, not alphabetically", async () => {
        givenRecording(12);

        const urls = await RecordingService.getThumbnailUrls(USER, `recording-${TIMESTAMP}`);

        // Alphabetical order would put _10 right after _1.
        expect(urls).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => `signed:${thumbnailKey(s)}`));
    });

    it("only ever lists the caller's own folder", async () => {
        givenRecording(4);

        await RecordingService.getThumbnailUrls(USER, `recording-${TIMESTAMP}`);

        expect(listPrefixes).toEqual([`${USER}/thumbnail-${TIMESTAMP}_`]);
    });

    it("rejects a recording name that is not one of ours", async () => {
        givenRecording(4);

        await expect(RecordingService.getThumbnailUrls(USER, "../other-user/thumbnail-")).rejects.toThrow(
            "Invalid recording name",
        );
        await expect(RecordingService.getThumbnailUrls(USER, "recording-2026-09-11T10:00:00 extra")).rejects.toThrow(
            "Invalid recording name",
        );
        expect(listPrefixes).toEqual([]);
    });
});
