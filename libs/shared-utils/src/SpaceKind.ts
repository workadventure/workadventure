import { z } from "zod";

/**
 * What a space is, declared by the client that joins it under the `spaceKind` metadata
 * key: a proximity bubble, a meeting area, the world megaphone, a speaker zone. A space
 * that declares nothing — the world space, a chat space, a space a script opened — is
 * nobody's meeting and nobody's broadcast.
 *
 * One key with a closed set of values rather than one boolean per kind: the front
 * validates what it receives against this schema and the back rejects anything else,
 * and anything inconsistent with the space's filter. Lives here rather than in
 * `@workadventure/messages` because every file under JsonMessages feeds the API
 * version hash, and a new value would force every connected front to reload.
 */
export const spaceKindSchema = z.enum(["bubble", "area", "megaphone", "speaker_zone"]);

export type SpaceKind = z.infer<typeof spaceKindSchema>;

/** A bubble and an area are meetings; the megaphone and a speaker zone are broadcasts. */
export const isMeetingKind = (kind: SpaceKind): boolean => kind === "bubble" || kind === "area";
