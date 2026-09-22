import type z from "zod";
import { RECORDING_METADATA_KEY, recordingMetadataSchema } from "@workadventure/shared-utils";

/**
 * Keys whose *initial* value should not be replayed to the observers when joining a space (an "idle"
 * recording is not an event worth reacting to). The shapes themselves live in the shared space-metadata
 * catalogue (@workadventure/shared-utils), which the back validates against too.
 */
export const spaceMetadataValidator: Map<
    string,
    {
        schema: z.ZodType<unknown>;
        shouldSkipInitialValueFunction: (value: unknown) => boolean;
    }
> = new Map();

export const recordingSchema = recordingMetadataSchema;

export type recordingValidator = z.infer<typeof recordingSchema>;

spaceMetadataValidator.set(RECORDING_METADATA_KEY, {
    schema: recordingSchema,
    shouldSkipInitialValueFunction: (value: unknown) => {
        const result = recordingSchema.safeParse(value);
        if (!result.success) {
            return true;
        }
        return result.data.status === "idle";
    },
});
