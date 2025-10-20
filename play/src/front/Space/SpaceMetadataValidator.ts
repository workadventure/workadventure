import z from "zod";

export const spaceMetadataValidator: Map<string,{ 
    schema: z.ZodObject<z.ZodRawShape>,
    shouldSkipInitialValueFunction: (value: unknown) => boolean,
}> = new Map();

export const recordingSchema = z.object({
    recording: z.boolean(),
    recorder: z.string().optional().nullable(),
});

export type recordingValidator = z.infer<typeof recordingSchema>;

spaceMetadataValidator.set("recording", {
    schema: recordingSchema,
    shouldSkipInitialValueFunction: (value: unknown)=>{
        const result = recordingSchema.safeParse(value);
        if(!result.success) {
            return true;
        }
        return !result.data.recording;
    },
});
