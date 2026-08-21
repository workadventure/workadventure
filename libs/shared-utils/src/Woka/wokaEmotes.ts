/**
 * Animated Woka emotes: the Woka itself performs the emote, as opposed to the emoji bubble
 * displayed above its head (see EmotePromptMessage.emote).
 *
 * A Woka spritesheet only holds 12 frames (walk and idle, four directions), and worlds may upload
 * their own, so an emote can never rely on frames that were never drawn. Every emote below is
 * therefore played procedurally: the layer sprites are offset, scaled and rotated, and the existing
 * frames are reordered. The recipes live in the front (WokaEmoteCatalog); only the identifiers are
 * shared, because the back has to reject anything it does not recognise before relaying it.
 */
/*
 * The order is the order of the wheel, and it groups by register: answers, then moods, then motion,
 * then the away state. A wheel is aimed roughly, so a near miss should land on something that means
 * roughly the same thing.
 */
export const WOKA_EMOTE_IDS = [
    "nod",
    "nope",
    "question",
    "laugh",
    "love",
    "celebrate",
    "dance",
    "moonwalk",
    "runInPlace",
    "jump",
    "spin",
    "afk",
] as const;

export type WokaEmoteId = (typeof WOKA_EMOTE_IDS)[number];

export function isWokaEmoteId(value: string): value is WokaEmoteId {
    return (WOKA_EMOTE_IDS as readonly string[]).includes(value);
}
