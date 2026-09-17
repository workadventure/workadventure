import { z } from "zod";

/**
 * What a broadcast space is, declared by the client that opens it under the `spaceKind`
 * metadata key — the one thing about a space the back cannot see for itself: it tells a
 * broadcast from a meeting by the filter, but the world megaphone and a speaker zone
 * join with the same one.
 *
 * One key with a closed set of values rather than one boolean per kind: the front
 * validates what it receives against this schema and the back rejects anything else,
 * so a kind nobody declared here cannot exist. Lives here rather than in
 * `@workadventure/messages` because every file under JsonMessages feeds the API
 * version hash, and a new value would force every connected front to reload.
 */
export const spaceKindSchema = z.enum(["megaphone", "speaker_zone"]);

export type SpaceKind = z.infer<typeof spaceKindSchema>;
