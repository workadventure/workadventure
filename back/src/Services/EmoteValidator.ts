/**
 * Emotes are broadcast as-is to every client listening to the sender's zone.
 * Only emojis (as picked in the emote menu) are legitimate values, so anything else is dropped
 * rather than relayed to other players.
 */

// Longest legitimate sequences (subdivision flags, families with skin tones) stay well below this limit.
export const MAX_EMOTE_LENGTH = 32;

const EMOJI_ONLY_REGEXP = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;

export function isValidEmote(emote: string): boolean {
    return emote.length > 0 && emote.length <= MAX_EMOTE_LENGTH && EMOJI_ONLY_REGEXP.test(emote);
}
