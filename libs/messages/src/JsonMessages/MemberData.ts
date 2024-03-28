import { z } from "zod";

export const MemberData = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  visitCardUrl: z.string().nullable(),
});

export type MemberData = z.infer<typeof MemberData>;
