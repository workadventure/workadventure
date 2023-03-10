import { z } from "zod";

export const FirstMatrixPasswordEvent = z.object({
    password: z.string(),
    overrideMemberPassword: z.number()
});

export type FirstMatrixPasswordEvent = z.infer<typeof FirstMatrixPasswordEvent>;
