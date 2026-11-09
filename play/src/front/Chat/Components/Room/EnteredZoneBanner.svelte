<script lang="ts">
    import { derived } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import type { ChatConversation } from "../../Connection/ChatConnection";
    import Button from "../../../Components/UI/Button.svelte";
    import { IconX } from "@wa-icons";

    interface Props {
        /** The conversation the banner is shown in. */
        room: ChatConversation;
    }

    let { room }: Props = $props();

    const proximityChatRoomManager = gameManager.getCurrentGameScene().proximityChatRoomManager;
    const enteredZoneRoom = proximityChatRoomManager.enteredZoneRoomStore;
    const zoneName = derived<typeof enteredZoneRoom, string>(enteredZoneRoom, (zoneRoom, set) =>
        zoneRoom ? zoneRoom.name.subscribe(set) : set(""),
    );

    // Opening the zone's chat in any way (this banner, the room list) answers the banner.
    $effect(() => {
        if ($enteredZoneRoom === room) {
            proximityChatRoomManager.dismissEnteredZoneRoom();
        }
    });

    function openZoneChat() {
        const zoneRoom = $enteredZoneRoom;
        if (!zoneRoom) return;
        selectedRoomStore.set(zoneRoom);
        proximityChatRoomManager.selectRoom(zoneRoom);
        zoneRoom.hasUnreadMessages.set(false);
        zoneRoom.unreadMessagesCount.set(0);
        zoneRoom.unreadNotificationCount.set(0);
        chatNotificationStore.clearRoom(zoneRoom.id);
    }
</script>

{#if $enteredZoneRoom && $enteredZoneRoom !== room}
    <div
        class="mx-2 flex items-center gap-2 rounded-lg border border-solid border-secondary bg-secondary/20 py-1 ps-3 pe-1 text-sm text-white"
        role="status"
        data-testid="enteredZoneBanner"
    >
        <span class="grow min-w-0 truncate">{$LL.chat.enteredZone.title({ zoneName: $zoneName })}</span>
        <Button variant="secondary" size="xs" onclick={openZoneChat} dataTestId="enteredZoneBannerOpen">
            {$LL.chat.enteredZone.open()}
        </Button>
        <Button
            variant="light"
            appearance="ghost"
            size="xs"
            square
            onclick={() => proximityChatRoomManager.dismissEnteredZoneRoom()}
            aria-label={$LL.chat.enteredZone.dismiss()}
        >
            {#snippet icon()}
                <IconX font-size="16" />
            {/snippet}
        </Button>
    </div>
{/if}
