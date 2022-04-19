import { z } from "zod";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isErrorApiData = z.object({
    type: z.string(),
    code: z.string(),
    title: z.string(),
    subtitle: z.string(),
    details: z.string(),
    image: z.string(),
    urlToRedirect: z.optional(z.nullable(z.string())),
    buttonTitle: z.optional(z.nullable(z.string())),
    timeToRetry: z.optional(z.nullable(z.bigint())),
    canRetryManual: z.optional(z.nullable(z.boolean()))
});

export type ErrorApiData = z.infer<typeof isErrorApiData>;
