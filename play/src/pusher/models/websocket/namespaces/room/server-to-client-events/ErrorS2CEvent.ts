import { ErrorApiData } from "@workadventure/messages";
import { z } from "zod";

export const ErrorS2CEventError = z.object({
    reason: z.literal("error"),
    status: z.number(),
    error: ErrorApiData,
});

export const ErrorS2CEventInvalidTexture = z.object({
    reason: z.literal("invalidTexture"),
    entityType: z.enum(["character", "companion"]),
});

export const ErrorS2CEventInvalidToken = z.object({
    reason: z.literal("tokenInvalid"),
    message: z.string(),
    roomId: z.string(),
});

export const ErrorS2CEventInvalidVersion = z.object({
    reason: z.literal("invalidVersion"),
    message: z.string(),
    roomId: z.string(),
});

export const ErrorS2CEventInvalidUnknown = z.object({
    reason: z.null(),
    message: z.string(),
    roomId: z.string(),
});

export const ErrorS2CEvent = z.discriminatedUnion("reason", [
    ErrorS2CEventError,
    ErrorS2CEventInvalidTexture,
    ErrorS2CEventInvalidToken,
    ErrorS2CEventInvalidVersion,
    ErrorS2CEventInvalidUnknown,
]);

export type ErrorS2CEventError = z.infer<typeof ErrorS2CEventError>;
export type ErrorS2CEventInvalidTexture = z.infer<typeof ErrorS2CEventInvalidTexture>;
export type ErrorS2CEventInvalidToken = z.infer<typeof ErrorS2CEventInvalidToken>;
export type ErrorS2CEvent = z.infer<typeof ErrorS2CEvent>;
