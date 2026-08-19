import type {
    FloorHolderEntry,
    FloorHolderIntent,
    RaiseHandIntent,
    RaisedHandEntry,
} from "@workadventure/shared-utils";

// Structural type rather than an import of Space, to keep this module free of a cycle with it.
type SpaceWithFloorState = {
    applyRaisedHand: (senderId: string, raised: boolean) => RaisedHandEntry[];
    applyFloorHolder: (senderId: string, holds: boolean) => FloorHolderEntry[];
};

/**
 * The client only sends its own intent; the shape is already validated by the catalogue in
 * MetadataProcessor, so all that is left here is to let the space compute the authoritative queue (order,
 * timestamp and name are stamped server-side from the trusted senderId).
 */
export function processRaisedHandsMetadata(
    value: RaiseHandIntent,
    senderId: string,
    space: SpaceWithFloorState,
): Promise<unknown> {
    return Promise.resolve(space.applyRaisedHand(senderId, value.raised));
}

export function processFloorHoldersMetadata(
    value: FloorHolderIntent,
    senderId: string,
    space: SpaceWithFloorState,
): Promise<unknown> {
    return Promise.resolve(space.applyFloorHolder(senderId, value.holds));
}
