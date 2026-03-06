import { describe, expect, it } from "vitest";
import { spaceMetadataValidator, transcriptionSchema } from "../../../src/front/Space/SpaceMetadataValidator";

describe("SpaceMetadataValidator transcription", () => {
    it("registers the transcription validator", () => {
        const validator = spaceMetadataValidator.get("transcription");

        expect(validator).toBeDefined();
        expect(validator?.schema).toBe(transcriptionSchema);
    });

    it("skips inactive initial transcription metadata", () => {
        const validator = spaceMetadataValidator.get("transcription");

        expect(validator?.shouldSkipInitialValueFunction({ transcription: false, transcriber: null })).toBe(true);
    });

    it("keeps active initial transcription metadata", () => {
        const validator = spaceMetadataValidator.get("transcription");

        expect(
            validator?.shouldSkipInitialValueFunction({
                transcription: true,
                transcriber: "user-uuid",
            })
        ).toBe(false);
    });

    it("skips invalid transcription metadata", () => {
        const validator = spaceMetadataValidator.get("transcription");

        expect(validator?.shouldSkipInitialValueFunction({ transcription: "yes" })).toBe(true);
    });
});
