import { writable } from "svelte/store";

/**
 * Whether the zones the local user currently stands in offer the raise-hand control.
 *
 * A LiveKit meeting area and a megaphone listener area can each turn it off through their map-editor
 * option (`raiseHandEnabled`, on by default), which is what these two stores carry. Spaces with no zone
 * (a proximity bubble, the room-level megaphone) have no option.
 *
 * They are plain writables in a module of their own, importing nothing but svelte/store: they are fed
 * by AreasPropertiesListener, which is part of the GameScene import graph, and a store in that graph
 * must not derive() from MediaStore at module level (it would evaluate against a half-initialised
 * MediaStore). The derived that combines them with the media state lives in RaiseHandAvailabilityStore.
 */

/** Set on entering a LiveKit meeting area, from its `livekitRoomConfig.raiseHandEnabled` option. */
export const meetingRaiseHandStore = writable(false);

/**
 * Set from the active megaphone zones: the space names of the zones the local user listens to whose
 * `raiseHandEnabled` option is on. Empty while they are themselves a speaker of a zone (the host).
 */
export const megaphoneRaiseHandSpacesStore = writable<ReadonlySet<string>>(new Set());
