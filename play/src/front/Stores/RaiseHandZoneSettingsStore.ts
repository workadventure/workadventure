import { writable } from "svelte/store";

/**
 * Whether the zone the local user currently stands in offers the raise-hand control.
 *
 * Raising a hand only makes sense where someone can act on it, so the feature is limited to the two
 * zones that have a host: a LiveKit meeting area, and a megaphone listener area. It is deliberately
 * NOT available in a proximity bubble. Each zone can turn it off through its map-editor option
 * (`raiseHandEnabled`, on by default), which is what these two stores carry.
 *
 * They are plain writables in a module of their own, importing nothing but svelte/store: they are fed
 * by AreasPropertiesListener, which is part of the GameScene import graph, and a store in that graph
 * must not derive() from MediaStore at module level (it would evaluate against a half-initialised
 * MediaStore). The derived that combines them with the media state lives in RaiseHandAvailabilityStore.
 */

/** Set on entering a LiveKit meeting area, from its `livekitRoomConfig.raiseHandEnabled` option. */
export const meetingRaiseHandStore = writable(false);

/**
 * Set from the active megaphone zones: true while the local user is a listener of at least one zone
 * whose `raiseHandEnabled` option is on (and is not themselves a speaker of that space).
 */
export const megaphoneRaiseHandStore = writable(false);

/**
 * True while the local user stands in any megaphone zone (speaker or listener, option on or off).
 * Tells "this spot is governed by a zone that says no" apart from "no zone governs this spot", which is
 * what the room-level megaphone audience looks like — see RaiseHandAvailabilityStore.
 */
export const inMegaphoneZoneStore = writable(false);
