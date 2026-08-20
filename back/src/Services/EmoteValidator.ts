import { isWokaEmoteId } from "@workadventure/shared-utils";

/**
 * Emotes are broadcast as-is to every client listening to the sender's zone.
 * Only emojis (as picked in the emote menu) and known Woka emote identifiers are legitimate values,
 * so anything else is dropped rather than relayed to other players.
 */

// Longest legitimate sequences (subdivision flags, families with skin tones) stay well below this limit.
export const MAX_EMOTE_LENGTH = 32;

const EMOJI_ONLY_REGEXP = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;

export function isValidEmote(emote: string): boolean {
    return emote.length > 0 && emote.length <= MAX_EMOTE_LENGTH && EMOJI_ONLY_REGEXP.test(emote);
}

/**
 * An animated Woka emote may travel with an emoji bubble, or on its own. The identifier is matched
 * against the shared allow-list: an unknown one would reach every nearby client and ask them to play
 * an animation that does not exist.
 */
export function isValidWokaEmote(wokaEmoteId: string, emote: string): boolean {
    return isWokaEmoteId(wokaEmoteId) && (emote.length === 0 || isValidEmote(emote));
}
