import { type Readable, derived } from "svelte/store";
import { inLivekitStore, isSpeakerStore, silentStore } from "./MediaStore";
import { givenFloorSpaceStore } from "./MegaphoneStore";
import { inMegaphoneZoneStore, meetingRaiseHandStore, megaphoneRaiseHandStore } from "./RaiseHandZoneSettingsStore";
import { isInRemoteConversation } from "./StreamableCollectionStore";

/**
 * Whether the raise-hand control should be offered to the local user.
 *
 * The control is offered in every remote conversation:
 *  - a LiveKit meeting area and a megaphone listener area, each of which can turn it off through its
 *    map-editor option (see RaiseHandZoneSettingsStore);
 *  - a proximity bubble and the room-level megaphone audience, which have no zone to configure, hence no
 *    option. In a bubble (or a meeting room) nobody is promoted: the raised hands only form an ordered
 *    queue everyone can see, so whoever leads the discussion can give the floor orally (see
 *    RaisedHandsAdminVisibleStore).
 *
 * Two exceptions to that rule:
 *  - once the floor has been granted, the same button becomes "give the floor back", so it must stay
 *    visible for as long as the local user holds it, wherever they are;
 *  - a genuine zone speaker is the host, not a hand raiser, so they never get it.
 *
 * Like RaisedHandsAdminVisibleStore, this module derives from MediaStore and must therefore only be
 * imported by components (which load well after the stores are initialised), never by the GameScene
 * import graph.
 */
export const raiseHandAvailableStore: Readable<boolean> = derived(
    [
        givenFloorSpaceStore,
        silentStore,
        isSpeakerStore,
        meetingRaiseHandStore,
        megaphoneRaiseHandStore,
        inLivekitStore,
        inMegaphoneZoneStore,
        isInRemoteConversation,
    ],
    ([
        $givenFloorSpace,
        $silent,
        $isSpeaker,
        $meetingRaiseHand,
        $megaphoneRaiseHand,
        $inLivekit,
        $inMegaphoneZone,
        $inRemoteConversation,
    ]) => {
        if ($givenFloorSpace !== undefined) {
            return true;
        }
        if ($silent || $isSpeaker) {
            return false;
        }
        if ($meetingRaiseHand || $megaphoneRaiseHand) {
            return true;
        }
        // A zone governs this spot and its option says no — don't fall through to the zone-less cases.
        if ($inLivekit || $inMegaphoneZone) {
            return false;
        }
        return $inRemoteConversation;
    },
);
