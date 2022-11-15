import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isOpidWokaNamePolicy = extendApi(z.enum(["user_input", "allow_override_opid", "force_opid"]), {
    example: "['user_input', 'allow_override_opid', 'force_opid']",
});
export type OpidWokaNamePolicy = z.infer<typeof isOpidWokaNamePolicy>;
