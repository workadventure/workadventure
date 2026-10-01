<script lang="ts">
    import { onDestroy } from "svelte";
    import type { Readable } from "svelte/store";
    import { derived, get } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { isHandRaisedStore, requestedHandRaiseState } from "../../../Stores/RaiseHandStore";
    import { raiseHandSpacesStore } from "../../../Stores/RaiseHandAvailabilityStore";
    import { isSpeakerStore, silentStore } from "../../../Stores/MediaStore";
    import { givenFloorSpaceStore } from "../../../Stores/MegaphoneStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import type { SpaceInterface } from "../../../Space/SpaceInterface";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import { LL } from "../../../../i18n/i18n-svelte";
    import RaiseHandIcon from "../../Icons/RaiseHandIcon.svelte";
    import RaiseHandSpacePicker, { type RaiseHandSpaceEntry } from "../../PopUp/RaiseHandSpacePicker.svelte";

    // A single control for the whole "ask to speak" lifecycle, so the raise-hand and give-back buttons are
    // never shown at once:
    //   normal -> click raises the hand (request the floor)
    //   active -> the hand is up, waiting; click lowers it
    //   live   -> the host granted the floor (on stage, green); click hands the floor back
    // With several spaces to raise the hand in (e.g. a bubble inside a listener zone), the click opens a picker
    // instead, like the lock button does.
    const buttonStateStore: Readable<"active" | "live" | "disabled" | "normal"> = derived(
        [isHandRaisedStore, silentStore, givenFloorSpaceStore],
        ([$isHandRaised, $silentStore, $givenFloorSpace]) => {
            if ($givenFloorSpace !== undefined) {
                return "live";
            }
            if ($silentStore) {
                return "disabled";
            }
            return $isHandRaised ? "active" : "normal";
        },
    );

    let closeFloatingUi: (() => void) | undefined = undefined;
    let triggerElement: HTMLElement | undefined = $state(undefined);

    function closePicker(): void {
        closeFloatingUi?.();
        closeFloatingUi = undefined;
    }

    // On stage: hand the floor back yourself (same effect as the former dedicated give-back button).
    function giveBackFloor(): void {
        const space = get(givenFloorSpaceStore);
        if (!space) {
            return;
        }
        analyticsClient.trackAdminEvent("meeting.floor.given_back");
        space.stopStreaming();
        isSpeakerStore.set(false);
        givenFloorSpaceStore.set(undefined);
        notificationPlayingStore.playNotification(get(LL).notification.floorGivenBack(), "microphone-off.png");
    }

    function toggleHand(spaceName: string): void {
        analyticsClient.trackAdminEvent("meeting.hand.toggled", {
            raised: !get(requestedHandRaiseState).has(spaceName),
        });
        requestedHandRaiseState.toggle(spaceName);
    }

    function label(space: SpaceInterface): string {
        if (space.kind === "bubble") {
            return $LL.actionbar.help.lock.bubbleLabel();
        }
        if (space.kind === "megaphone") {
            return $LL.megaphone.modal.liveMessage.title();
        }
        // Meeting rooms and listener zones carry their display name on their proximity chat room.
        const room = get(gameManager.getCurrentGameScene().proximityChatRoomManager.roomsStore).find(
            (candidate) => candidate.getCurrentSpaceName() === space.getName(),
        );
        return room ? get(room.name) : space.getName();
    }

    function onClick(): void {
        if (get(givenFloorSpaceStore) !== undefined) {
            giveBackFloor();
            return;
        }
        if ($silentStore) {
            return;
        }
        const spaces = $raiseHandSpacesStore;
        if (spaces.length === 1) {
            toggleHand(spaces[0].getName());
            return;
        }
        if (closeFloatingUi) {
            closePicker();
            return;
        }
        if (spaces.length === 0 || !triggerElement) {
            return;
        }
        const raisedIn = get(requestedHandRaiseState);
        const entries: RaiseHandSpaceEntry[] = spaces.map((space) => ({
            spaceName: space.getName(),
            kind: space.kind ?? "",
            label: label(space),
            raised: raisedIn.has(space.getName()),
        }));
        closeFloatingUi = showFloatingUi(
            triggerElement,
            RaiseHandSpacePicker,
            {
                entries,
                onselect: (entry: RaiseHandSpaceEntry) => toggleHand(entry.spaceName),
                onclose: closePicker,
            },
            { placement: "bottom" },
            8,
            true,
        );
    }

    // The picker is portal-rendered at the app root: it must not outlive the button (e.g. when leaving the bubble).
    onDestroy(() => {
        closePicker();
    });
</script>

<ActionBarButton
    onclick={onClick}
    classList="group/btn-raise-hand"
    disabledHelp={$openedMenuStore !== undefined}
    state={$buttonStateStore}
    dataTestId="raise-hand-button"
    tooltipTitle={$givenFloorSpaceStore
        ? $LL.actionbar.help.giveBackFloor.title()
        : $LL.actionbar.help.raiseHand.title()}
    desc={$givenFloorSpaceStore ? $LL.actionbar.help.giveBackFloor.desc() : $LL.actionbar.help.raiseHand.desc()}
    bind:wrapperDiv={triggerElement}
>
    <RaiseHandIcon
        strokeColor={$isHandRaisedStore || $givenFloorSpaceStore
            ? "stroke-contrast fill-white"
            : "stroke-white fill-transparent"}
        hover="group-hover/btn-raise-hand:fill-white"
    />
</ActionBarButton>
