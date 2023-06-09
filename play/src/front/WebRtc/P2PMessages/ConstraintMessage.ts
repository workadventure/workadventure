import { z } from "zod";

export const ObtainedMediaStreamConstraints = z.object({
    audio: z.boolean(),
    video: z.boolean(),
});

export type ObtainedMediaStreamConstraints = z.infer<typeof ObtainedMediaStreamConstraints>;

export const ConstraintMessage = z.object({
    type: z.literal("constraint"),
    message: ObtainedMediaStreamConstraints,
});

export type ConstraintMessage = z.infer<typeof ConstraintMessage>;
