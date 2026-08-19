import { asError } from "catch-unknown";
import { z } from "zod";

export const RAISED_HANDS_METADATA_KEY = "raisedHands";
export const FLOOR_HOLDERS_METADATA_KEY = "floorHolders";

// What a client is allowed to send: its own intent, and nothing else. Everything that matters -- identity,
// order, timestamp, display name -- is stamped server-side from the trusted senderId, so an invalid payload
// is rejected instead of being coerced (a malformed frame must not silently lower somebody's hand).
const raiseHandIntentSchema = z.object({ raised: z.boolean() });
const floorHolderIntentSchema = z.object({ holds: z.boolean() });

// Shape of what the server itself stores under those keys. A client can never write it directly: the
// processors below always replace the incoming value with the server-computed one. So a value that fails to
// parse means the map holds something we never put there -- fall back to an empty list rather than throw.
const raisedHandEntrySchema = z.object({
    spaceUserId: z.string().min(1),
    name: z.string(),
    at: z.number().int(),
});
const floorHolderEntrySchema = z.object({
    spaceUserId: z.string().min(1),
    name: z.string(),
});

export const raisedHandsQueueSchema = z.array(raisedHandEntrySchema).catch([]);
export const floorHoldersSchema = z.array(floorHolderEntrySchema).catch([]);

export type RaisedHandEntry = z.infer<typeof raisedHandEntrySchema>;
export type FloorHolderEntry = z.infer<typeof floorHolderEntrySchema>;

// Structural type rather than an import of Space, to keep this module free of a cycle with it.
type SpaceWithFloorState = {
    applyRaisedHand: (senderId: string, raised: boolean) => RaisedHandEntry[];
    applyFloorHolder: (senderId: string, holds: boolean) => FloorHolderEntry[];
};

export function processRaisedHandsMetadata(
    value: unknown,
    senderId: string,
    space: SpaceWithFloorState,
): Promise<unknown> {
    return resolveProcessedMetadata(() => space.applyRaisedHand(senderId, raiseHandIntentSchema.parse(value).raised));
}

export function processFloorHoldersMetadata(
    value: unknown,
    senderId: string,
    space: SpaceWithFloorState,
): Promise<unknown> {
    return resolveProcessedMetadata(() => space.applyFloorHolder(senderId, floorHolderIntentSchema.parse(value).holds));
}

function resolveProcessedMetadata(process: () => unknown): Promise<unknown> {
    try {
        return Promise.resolve(process());
    } catch (error) {
        return Promise.reject(asError(error));
    }
}
