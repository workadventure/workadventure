import { z } from "zod";

export const TeamsMeetingPropertyData = z.object({
    id: z.string(),
    subtype: z.string(),
    type: z.string(),
    data: z.string().optional(),
});
export type TeamsMeetingPropertyData = z.infer<typeof TeamsMeetingPropertyData>;
