import z from "zod";

export const spaceMetadataValidator: Map<
    string,
    {
        schema: z.ZodObject<z.ZodRawShape>;
        shouldSkipInitialValueFunction: (value: unknown) => boolean;
    }
> = new Map();

export const recordingSchema = z.object({
    recording: z.boolean(),
    recorder: z.string().optional().nullable(),
});

export type recordingValidator = z.infer<typeof recordingSchema>;

export const transcriptionSchema = z.object({
    transcription: z.boolean(),
    transcriber: z.string().optional().nullable(),
});

export type transcriptionValidator = z.infer<typeof transcriptionSchema>;

spaceMetadataValidator.set("recording", {
    schema: recordingSchema,
    shouldSkipInitialValueFunction: (value: unknown) => {
        const result = recordingSchema.safeParse(value);
        if (!result.success) {
            return true;
        }
        return !result.data.recording;
    },
});

spaceMetadataValidator.set("transcription", {
    schema: transcriptionSchema,
    shouldSkipInitialValueFunction: (value: unknown) => {
        const result = transcriptionSchema.safeParse(value);
        if (!result.success) {
            return true;
        }
        return !result.data.transcription;
    },
});
