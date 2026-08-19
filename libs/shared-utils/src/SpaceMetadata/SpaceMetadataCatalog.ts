import type { z } from "zod";
import {
    FLOOR_HOLDERS_METADATA_KEY,
    RAISED_HANDS_METADATA_KEY,
    floorHolderIntentSchema,
    floorHoldersSchema,
    raiseHandIntentSchema,
    raisedHandsQueueSchema,
} from "./RaisedHandsMetadata";
import { RECORDING_METADATA_KEY, recordingMetadataSchema } from "./RecordingMetadata";
import {
    PROXIMITY_POLL_DEFINITION_PREFIX,
    PROXIMITY_POLL_DELETE_PREFIX,
    PROXIMITY_POLL_END_PREFIX,
    PROXIMITY_POLL_VOTE_PREFIX,
    proximityPollDefinitionMetadataSchema,
    proximityPollDeleteMetadataSchema,
    proximityPollEndMetadataSchema,
    proximityPollVoteMetadataSchema,
} from "./ProximityPollMetadata";
import type {
    ProximityPollDefinitionMetadata,
    ProximityPollDeleteMetadata,
    ProximityPollEndMetadata,
    ProximityPollVoteMetadata,
} from "./ProximityPollMetadata";
import {
    PROXIMITY_QA_ANSWER_PREFIX,
    PROXIMITY_QA_DELETE_PREFIX,
    PROXIMITY_QA_QUESTION_PREFIX,
    PROXIMITY_QA_UPVOTE_PREFIX,
    proximityQAAnswerMetadataSchema,
    proximityQADeleteMetadataSchema,
    proximityQAQuestionMetadataSchema,
    proximityQAUpvoteMetadataSchema,
} from "./ProximityQAMetadata";
import type {
    ProximityQAAnswerMetadata,
    ProximityQADeleteMetadata,
    ProximityQAQuestionMetadata,
    ProximityQAUpvoteMetadata,
} from "./ProximityQAMetadata";

/**
 * The catalogue of every space-metadata key the application knows about.
 *
 * Space metadata is a `Map<string, unknown>` on the wire: the back stores it, broadcasts it to every member
 * of the space, and both sides used to re-validate (or cast) each value at every read site -- with the same
 * schemas written twice, once in `back` and once in `play`. This module is the single place where a key is
 * mapped to its shape, so that a value can be checked once, on reception, and be correctly typed everywhere
 * after that.
 *
 * Two schemas per key, because they are not the same thing:
 *  - `incoming` -- what a *client* may send under that key. `undefined` means the key is server-owned and a
 *    client write must be rejected (currently: "recording").
 *  - `stored` -- what the server actually keeps, and therefore what every member receives. For most keys the
 *    two are identical; for the raise-hand keys the client sends an intent (`{ raised: true }`) while the
 *    server stores the computed, ordered queue.
 *
 * Keys the catalogue does not know are NOT an error: the scripting API (WA.spaces) lets a map author publish
 * arbitrary metadata. Those pass through unvalidated and stay typed `unknown`.
 */

// Keys whose whole value is written in one go.
const exactSpaceMetadataEntries = {
    [RAISED_HANDS_METADATA_KEY]: { incoming: raiseHandIntentSchema, stored: raisedHandsQueueSchema },
    [FLOOR_HOLDERS_METADATA_KEY]: { incoming: floorHolderIntentSchema, stored: floorHoldersSchema },
    [RECORDING_METADATA_KEY]: { incoming: undefined, stored: recordingMetadataSchema },
} as const;

// Key families: the id travels in the key, so only the prefix is fixed. A prefix must never be a prefix of
// another one -- the trailing ":" guarantees it ("proximityPoll:" does not match "proximityPollVote:x").
const prefixedSpaceMetadataEntries = {
    [PROXIMITY_POLL_DEFINITION_PREFIX]: {
        incoming: proximityPollDefinitionMetadataSchema,
        stored: proximityPollDefinitionMetadataSchema,
    },
    [PROXIMITY_POLL_VOTE_PREFIX]: {
        incoming: proximityPollVoteMetadataSchema,
        stored: proximityPollVoteMetadataSchema,
    },
    [PROXIMITY_POLL_END_PREFIX]: { incoming: proximityPollEndMetadataSchema, stored: proximityPollEndMetadataSchema },
    [PROXIMITY_POLL_DELETE_PREFIX]: {
        incoming: proximityPollDeleteMetadataSchema,
        stored: proximityPollDeleteMetadataSchema,
    },
    [PROXIMITY_QA_QUESTION_PREFIX]: {
        incoming: proximityQAQuestionMetadataSchema,
        stored: proximityQAQuestionMetadataSchema,
    },
    [PROXIMITY_QA_UPVOTE_PREFIX]: {
        incoming: proximityQAUpvoteMetadataSchema,
        stored: proximityQAUpvoteMetadataSchema,
    },
    [PROXIMITY_QA_ANSWER_PREFIX]: {
        incoming: proximityQAAnswerMetadataSchema,
        stored: proximityQAAnswerMetadataSchema,
    },
    [PROXIMITY_QA_DELETE_PREFIX]: {
        incoming: proximityQADeleteMetadataSchema,
        stored: proximityQADeleteMetadataSchema,
    },
} as const;

export type ExactSpaceMetadataKey = keyof typeof exactSpaceMetadataEntries;
export type SpaceMetadataPrefix = keyof typeof prefixedSpaceMetadataEntries;
export type PrefixedSpaceMetadataKey = `${SpaceMetadataPrefix}${string}`;

/** Every key the catalogue knows. Any other string is valid too, it is just not described here. */
export type KnownSpaceMetadataKey = ExactSpaceMetadataKey | PrefixedSpaceMetadataKey;

/**
 * The prefixed families, resolved one by one rather than through `infer P extends SpaceMetadataPrefix`:
 * inferring the prefix makes TypeScript try every candidate and hand back the union of all of them. The
 * order does not matter -- the trailing ":" makes the prefixes mutually exclusive, so at most one matches.
 * For these families a client sends exactly what gets stored, so one resolution serves both directions.
 */
type PrefixedSpaceMetadataValue<K extends string> = K extends `${typeof PROXIMITY_POLL_DEFINITION_PREFIX}${string}`
    ? ProximityPollDefinitionMetadata
    : K extends `${typeof PROXIMITY_POLL_VOTE_PREFIX}${string}`
      ? ProximityPollVoteMetadata
      : K extends `${typeof PROXIMITY_POLL_END_PREFIX}${string}`
        ? ProximityPollEndMetadata
        : K extends `${typeof PROXIMITY_POLL_DELETE_PREFIX}${string}`
          ? ProximityPollDeleteMetadata
          : K extends `${typeof PROXIMITY_QA_QUESTION_PREFIX}${string}`
            ? ProximityQAQuestionMetadata
            : K extends `${typeof PROXIMITY_QA_UPVOTE_PREFIX}${string}`
              ? ProximityQAUpvoteMetadata
              : K extends `${typeof PROXIMITY_QA_ANSWER_PREFIX}${string}`
                ? ProximityQAAnswerMetadata
                : K extends `${typeof PROXIMITY_QA_DELETE_PREFIX}${string}`
                  ? ProximityQADeleteMetadata
                  : unknown;

/**
 * The value stored under `K`. Resolves to `unknown` for a key the catalogue does not describe, so scripting
 * API metadata keeps working and simply stays untyped.
 */
export type StoredSpaceMetadata<K extends string> = K extends ExactSpaceMetadataKey
    ? z.infer<(typeof exactSpaceMetadataEntries)[K]["stored"]>
    : PrefixedSpaceMetadataValue<K>;

/** What a client may send under `K`. `never` for a server-owned key, `unknown` for an unknown key. */
export type IncomingSpaceMetadata<K extends string> = K extends ExactSpaceMetadataKey
    ? (typeof exactSpaceMetadataEntries)[K]["incoming"] extends z.ZodType
        ? z.infer<NonNullable<(typeof exactSpaceMetadataEntries)[K]["incoming"]>>
        : never
    : PrefixedSpaceMetadataValue<K>;

type CatalogEntry = { incoming: z.ZodTypeAny | undefined; stored: z.ZodTypeAny };

function findCatalogEntry(key: string): CatalogEntry | undefined {
    const exact: CatalogEntry | undefined = exactSpaceMetadataEntries[key as ExactSpaceMetadataKey];
    if (exact) {
        return exact;
    }
    for (const [prefix, entry] of Object.entries(prefixedSpaceMetadataEntries)) {
        if (key.startsWith(prefix)) {
            return entry;
        }
    }
    return undefined;
}

/** True when the key exists in the catalogue but no client is allowed to write it. */
export function isServerOwnedSpaceMetadataKey(key: string): boolean {
    const entry = findCatalogEntry(key);
    return entry !== undefined && entry.incoming === undefined;
}

/**
 * Validates a value a client sent for `key`.
 *
 * Throws when the key is server-owned or the payload does not match. Returns the value untouched for a key
 * the catalogue does not describe (scripting API metadata).
 */
export function parseIncomingSpaceMetadata<K extends string>(key: K, value: unknown): IncomingSpaceMetadata<K> {
    const entry = findCatalogEntry(key);
    if (!entry) {
        return value as IncomingSpaceMetadata<K>;
    }
    if (!entry.incoming) {
        throw new Error(`Space metadata "${key}" is set by the server and cannot be set by a client`);
    }
    return entry.incoming.parse(value) as IncomingSpaceMetadata<K>;
}

/**
 * Reads a value back from the metadata map.
 *
 * Returns `undefined` when the value does not match what the catalogue expects, rather than throwing: on the
 * read path a corrupt or absent entry should degrade (an empty queue, no poll) instead of breaking the
 * caller. A key the catalogue does not describe is returned as-is.
 */
export function parseStoredSpaceMetadata<K extends string>(key: K, value: unknown): StoredSpaceMetadata<K> | undefined {
    const entry = findCatalogEntry(key);
    if (!entry) {
        return value as StoredSpaceMetadata<K>;
    }
    const result = entry.stored.safeParse(value);
    return result.success ? (result.data as StoredSpaceMetadata<K>) : undefined;
}
