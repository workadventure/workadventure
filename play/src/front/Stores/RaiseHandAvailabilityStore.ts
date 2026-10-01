import { type Readable, derived } from "svelte/store";
import type { SpaceInterface } from "../Space/SpaceInterface";
import { isSpeakerStore, silentStore } from "./MediaStore";
import { givenFloorSpaceStore, requestedMegaphoneStore } from "./MegaphoneStore";
import { mediaSynchronizedSpacesStore } from "./PeerStore";
import { requestedHandRaiseState } from "./RaiseHandStore";
import { meetingRaiseHandStore, megaphoneRaiseHandSpacesStore } from "./RaiseHandZoneSettingsStore";

/**
 * The spaces the local user can raise their hand in, among the spaces they sync their media with.
 *
 * A hand is raised per space (see RaiseHandStore): with several spaces at once, the raise-hand button lets
 * the user pick, like the lock button does. Which spaces qualify depends on what they are:
 *  - a proximity bubble always does: nobody is promoted there, the raised hands only form an ordered queue
 *    everyone can see, so whoever leads the discussion can give the floor orally;
 *  - a LiveKit meeting area and a megaphone listener area do unless their map-editor option is off (see
 *    RaiseHandZoneSettingsStore); a podium speaker is the host and never gets their own zone;
 *  - the room-level megaphone only while someone is on air, unless the local user is the one broadcasting,
 *    and only when no other space qualifies: a hand raised in a bubble is meant for the bubble, not for
 *    the whole room listening to the megaphone;
 *  - the world space (no kind) never does.
 *
 * A space the hand is already up in always stays in the list, whatever the rules above now say (a bubble
 * formed during a megaphone live, an option turned off): the user must still be able to lower it.
 */
export const raiseHandSpacesStore: Readable<SpaceInterface[]> = derived(
    [
        mediaSynchronizedSpacesStore,
        meetingRaiseHandStore,
        megaphoneRaiseHandSpacesStore,
        requestedMegaphoneStore,
        requestedHandRaiseState,
    ],
    ([$spaces, $meetingRaiseHand, $listenerSpaces, $broadcasting, $raisedIn], set) => {
        const megaphones = $spaces.filter((space) => space.kind === "megaphone");
        const others = $spaces.filter(
            (space) =>
                space.kind === "bubble" ||
                (space.kind === "area" && $meetingRaiseHand) ||
                (space.kind === "speaker_zone" && $listenerSpaces.has(space.getName())),
        );
        const select = (liveMegaphones: SpaceInterface[]) =>
            $spaces.filter(
                (space) =>
                    others.includes(space) ||
                    (others.length === 0 && !$broadcasting && liveMegaphones.includes(space)) ||
                    $raisedIn.has(space.getName()),
            );

        if (megaphones.length === 0) {
            set(select([]));
            return () => {};
        }
        return derived(
            megaphones.map((space) => space.isStreamingAudioStore),
            (onAir) => select(megaphones.filter((_, index) => onAir[index])),
        ).subscribe(set);
    },
);

/**
 * Whether the raise-hand control should be offered to the local user: as soon as one space qualifies (see
 * raiseHandSpacesStore), with two exceptions:
 *  - once the floor has been granted, the same button becomes "give the floor back", so it must stay
 *    visible for as long as the local user holds it, wherever they are;
 *  - a genuine zone speaker is the host, not a hand raiser, so they never get it.
 *
 * Like RaisedHandsAdminVisibleStore, this module derives from MediaStore and must therefore only be
 * imported by components (which load well after the stores are initialised), never by the GameScene
 * import graph.
 */
export const raiseHandAvailableStore: Readable<boolean> = derived(
    [givenFloorSpaceStore, silentStore, isSpeakerStore, raiseHandSpacesStore],
    ([$givenFloorSpace, $silent, $isSpeaker, $raiseHandSpaces]) => {
        if ($givenFloorSpace !== undefined) {
            return true;
        }
        return !$silent && !$isSpeaker && $raiseHandSpaces.length > 0;
    },
);
