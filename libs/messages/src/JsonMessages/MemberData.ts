import { z } from "zod";

export const MemberData = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string(),
});

export type MemberData = z.infer<typeof MemberData>;
