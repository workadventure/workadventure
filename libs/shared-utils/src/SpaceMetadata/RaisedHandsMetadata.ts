import { z } from "zod";

export const RAISED_HANDS_METADATA_KEY = "raisedHands";
export const FLOOR_HOLDERS_METADATA_KEY = "floorHolders";

// What a client is allowed to send under those keys: its own intent, and nothing else. Everything that
// matters -- identity, order, timestamp, display name -- is stamped server-side from the trusted senderId,
// so an invalid payload is rejected rather than coerced (a malformed frame must not silently lower a hand).
export const raiseHandIntentSchema = z.object({ raised: z.boolean() });
export const floorHolderIntentSchema = z.object({ holds: z.boolean() });

// What the server stores under those keys, and therefore what every member receives. The queue is ordered
// by `at`; both lists live in the space metadata (broadcast to all members regardless of the space filter)
// so a megaphone speaker without seeAttendees still sees them.
export const raisedHandEntrySchema = z.object({
    spaceUserId: z.string().min(1),
    name: z.string(),
    at: z.number().int(),
});
export const floorHolderEntrySchema = z.object({
    spaceUserId: z.string().min(1),
    name: z.string(),
});

export const raisedHandsQueueSchema = z.array(raisedHandEntrySchema);
export const floorHoldersSchema = z.array(floorHolderEntrySchema);

export type RaiseHandIntent = z.infer<typeof raiseHandIntentSchema>;
export type FloorHolderIntent = z.infer<typeof floorHolderIntentSchema>;
export type RaisedHandEntry = z.infer<typeof raisedHandEntrySchema>;
export type FloorHolderEntry = z.infer<typeof floorHolderEntrySchema>;
