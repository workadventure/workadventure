import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const OpidWokaNamePolicy = extendApi(z.enum(["user_input", "allow_override_opid", "force_opid", ""]), {
    example: "['user_input', 'allow_override_opid', 'force_opid']",
})
    .optional()
    .nullable();
export type OpidWokaNamePolicy = z.infer<typeof OpidWokaNamePolicy>;
