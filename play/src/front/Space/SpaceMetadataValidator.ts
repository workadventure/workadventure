import z from "zod";

export const spaceMetadataValidator: Map<
    string,
    {
        schema: z.ZodType<unknown>;
        shouldSkipInitialValueFunction: (value: unknown) => boolean;
    }
> = new Map();

const recordingStatusSchema = z.enum(["idle", "starting", "recording", "stopping"]);

export const recordingSchema = z
    .object({
        recording: z.boolean(),
        recorder: z.string().optional().nullable(),
        status: recordingStatusSchema.optional(),
    })
    .transform((value) => ({
        recording: value.recording,
        recorder: value.recorder ?? null,
        status: value.status ?? (value.recording ? "recording" : "idle"),
    }));

export type recordingValidator = z.infer<typeof recordingSchema>;

spaceMetadataValidator.set("recording", {
    schema: recordingSchema,
    shouldSkipInitialValueFunction: (value: unknown) => {
        const result = recordingSchema.safeParse(value);
        if (!result.success) {
            return true;
        }
        return result.data.status === "idle";
    },
});
