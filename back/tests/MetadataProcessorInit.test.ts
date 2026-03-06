import { describe, expect, it, vi } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import { metadataProcessor } from "../src/Model/MetadataProcessorInit";

describe("back metadataProcessor transcription", () => {
    const spaceUser = SpaceUser.fromPartial({
        spaceUserId: "space-user-id",
        uuid: "user-uuid",
        name: "User",
        playUri: "http://play.test",
    });

    it("starts transcription for valid start metadata", async () => {
        const space = {
            getUser: vi.fn().mockReturnValue(spaceUser),
            startTranscription: vi.fn().mockResolvedValue(undefined),
            stopTranscription: vi.fn().mockResolvedValue(undefined),
        };

        const result = await metadataProcessor.processMetadata(
            "transcription",
            {
                transcription: true,
                transcriber: "user-uuid",
            },
            "space-user-id",
            space as never
        );

        expect(space.startTranscription).toHaveBeenCalledWith(spaceUser);
        expect(result).toEqual({
            transcriber: "user-uuid",
            transcription: true,
        });
    });

    it("stops transcription for valid stop metadata", async () => {
        const space = {
            getUser: vi.fn().mockReturnValue(spaceUser),
            startTranscription: vi.fn().mockResolvedValue(undefined),
            stopTranscription: vi.fn().mockResolvedValue(undefined),
        };

        const result = await metadataProcessor.processMetadata(
            "transcription",
            {
                transcription: false,
                transcriber: "user-uuid",
            },
            "space-user-id",
            space as never
        );

        expect(space.stopTranscription).toHaveBeenCalledWith(spaceUser);
        expect(result).toEqual({
            transcriber: null,
            transcription: false,
        });
    });

    it("returns an inactive payload when transcription metadata is invalid", async () => {
        const space = {
            getUser: vi.fn(),
            startTranscription: vi.fn(),
            stopTranscription: vi.fn(),
        };

        const result = await metadataProcessor.processMetadata(
            "transcription",
            {
                transcription: "yes",
            },
            "space-user-id",
            space as never
        );

        expect(space.getUser).not.toHaveBeenCalled();
        expect(result).toEqual({
            transcriber: null,
            transcription: false,
        });
    });

    it("returns an inactive payload when transcription start fails", async () => {
        const error = new Error("start failed");
        const space = {
            getUser: vi.fn().mockReturnValue(spaceUser),
            startTranscription: vi.fn().mockRejectedValue(error),
            stopTranscription: vi.fn().mockResolvedValue(undefined),
        };

        const result = await metadataProcessor.processMetadata(
            "transcription",
            {
                transcription: true,
                transcriber: "user-uuid",
            },
            "space-user-id",
            space as never
        );

        expect(result).toEqual({
            transcriber: null,
            transcription: false,
        });
    });

    it("rethrows stop failures", async () => {
        const error = new Error("stop failed");
        const space = {
            getUser: vi.fn().mockReturnValue(spaceUser),
            startTranscription: vi.fn().mockResolvedValue(undefined),
            stopTranscription: vi.fn().mockRejectedValue(error),
        };

        await expect(
            metadataProcessor.processMetadata(
                "transcription",
                {
                    transcription: false,
                    transcriber: "user-uuid",
                },
                "space-user-id",
                space as never
            )
        ).rejects.toThrow("stop failed");
    });
});
