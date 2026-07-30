import { type Readable, derived } from "svelte/store";
import { raisedHandsStore, speakingUsersStore } from "./PeerStore";
import { userIsAdminStore } from "./GameStore";
import { isSpeakerStore } from "./MediaStore";
import { givenFloorSpaceStore } from "./MegaphoneStore";

/**
 * Whether the host-side raised-hands panel should be shown: only to a user who is allowed to moderate
 * (an admin, or a genuine megaphone-zone speaker) and only while there is something to act on (at least
 * one raised hand or one user currently holding the floor). Single source of truth for the panel's auto
 * show/hide; it used to live inline in ActionBar.svelte.
 *
 * A listener who was GIVEN the floor is also a "speaker" (isSpeakerStore), but must NOT inherit the host's
 * moderation rights (otherwise a promoted guest could in turn hand the floor to others). Such a promoted
 * guest is the one with givenFloorSpaceStore set; a genuine zone speaker clears it (see
 * AreasPropertiesListener.supersedeGrantedFloor), and admins moderate regardless. So the speaker branch is
 * gated on givenFloorSpaceStore being undefined.
 *
 * It lives apart from RaisedHandsStore on purpose: that module is imported by GameScene, and MediaStore is
 * (transitively) part of GameScene's own import cycle, so deriving from isSpeakerStore there evaluated
 * against a half-initialised MediaStore ("derived() expects stores as input, got a falsy value"). Only the
 * dock component needs this store, and it is imported well after the stores are initialised.
 */
export const raisedHandsAdminVisibleStore: Readable<boolean> = derived(
    [userIsAdminStore, isSpeakerStore, givenFloorSpaceStore, raisedHandsStore, speakingUsersStore],
    ([$userIsAdmin, $isSpeaker, $givenFloorSpace, $raisedHands, $speakers]) => {
        const canModerate = $userIsAdmin || ($isSpeaker && $givenFloorSpace === undefined);
        return canModerate && ($raisedHands.length > 0 || $speakers.length > 0);
    },
);
