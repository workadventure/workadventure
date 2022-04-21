import { z } from "zod";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isErrorApiErrorData = z.object({
    // @ts-ignore
    type: z.literal('error'),
    code: z.string(),
    title: z.string(),
    subtitle: z.string(),
    details: z.string(),
    image: z.string(),
});

export const isErrorApiRetryData = z.object({
    type: z.literal('retry'),
    code: z.string(),
    title: z.string(),
    subtitle: z.string(),
    details: z.string(),
    image: z.string(),
    buttonTitle: z.optional(z.nullable(z.string())),
    timeToRetry: z.number(),
    canRetryManual: z.boolean(),
});

export const isErrorApiRedirectData = z.object({
    type: z.literal('redirect'),
    urlToRedirect: z.string(),
});

export const isErrorApiUnauthorizedData = z.object({
    type: z.literal('unauthorized'),
});

export const isErrorApiData = z.discriminatedUnion("type", [
    isErrorApiErrorData,
    isErrorApiRetryData,
    isErrorApiRedirectData,
    isErrorApiUnauthorizedData,
]);

export type ErrorApiErrorData = z.infer<typeof isErrorApiErrorData>;
export type ErrorApiRetryData = z.infer<typeof isErrorApiRetryData>;
export type ErrorApiRedirectData = z.infer<typeof isErrorApiRedirectData>;
export type ErrorApiUnauthorizedData = z.infer<typeof isErrorApiUnauthorizedData>;

export type ErrorApiData = z.infer<typeof isErrorApiData>;
