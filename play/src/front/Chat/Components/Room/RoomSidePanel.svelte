<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import type {
        ChatRoom,
        ChatRoomMembershipManagement,
        ChatRoomModeration,
        ChatRoomNotificationControl,
    } from "../../Connection/ChatConnection";
    import { roomSidePanelStore, type RoomSidePanelSection } from "../../Stores/RoomSidePanelStore";
    import ThreadPanel from "./ThreadPanel.svelte";
    import RoomSidePanelParticipants from "./RoomSidePanelParticipants.svelte";
    import RoomSidePanelPolls from "./RoomSidePanelPolls.svelte";
    import RoomSidePanelHome from "./RoomSidePanelHome.svelte";
    import RoomSidePanelSettings from "./RoomSidePanelSettings.svelte";
    import { IconChevronLeft, IconX } from "@wa-icons";

    export let room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration & ChatRoomNotificationControl;
    export let showCloseButton = false;
    export let closeOnTimelineFocus = false;

    function activateSection(section: RoomSidePanelSection) {
        roomSidePanelStore.setActiveSection(section);
    }

    $: shouldShowCloseButton = showCloseButton || $roomSidePanelStore.activeSection === "settings";

</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="roomSidePanel">
    {#if $roomSidePanelStore.activeSection !== "home" || shouldShowCloseButton}
        <div class="border border-solid border-x-0 border-t-0 border-white/10 px-3 py-3">
            <div class="flex items-center gap-2">
                {#if $roomSidePanelStore.activeSection !== "home"}
                    <button
                        type="button"
                        class="m-0 flex aspect-square h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-solid border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                        data-testid="roomSidePanelBackButton"
                        title={$LL.chat.roomPanel.back()}
                        aria-label={$LL.chat.roomPanel.back()}
                        on:click={() => activateSection("home")}
                    >
                        <IconChevronLeft font-size={18} />
                    </button>
                    <div class="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-widest text-white/75">
                        {#if $roomSidePanelStore.activeSection === "threads"}
                            {$LL.chat.roomPanel.sections.threads()}
                        {:else if $roomSidePanelStore.activeSection === "polls"}
                            {$LL.chat.roomPanel.sections.polls()}
                        {:else if $roomSidePanelStore.activeSection === "participants"}
                            {$LL.chat.roomPanel.sections.participants()}
                        {:else if $roomSidePanelStore.activeSection === "settings"}
                            {$LL.chat.roomPanel.sections.settings()}
                        {/if}
                    </div>
                {:else}
                    <div class="min-w-0 flex-1" />
                {/if}
                {#if shouldShowCloseButton}
                    <button
                        type="button"
                        class="m-0 flex aspect-square h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-solid border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                        data-testid="closeRoomSidePanelButton"
                        title={$LL.chat.roomPanel.toggleClose()}
                        aria-label={$LL.chat.roomPanel.toggleClose()}
                        on:click={() => roomSidePanelStore.close()}
                    >
                        <IconX font-size={18} />
                    </button>
                {/if}
            </div>
        </div>
    {/if}

    <div class="min-h-0 flex-1 overflow-hidden">
        {#if $roomSidePanelStore.activeSection === "home"}
            <RoomSidePanelHome {room} />
        {:else if $roomSidePanelStore.activeSection === "threads"}
            <ThreadPanel {room} />
        {:else if $roomSidePanelStore.activeSection === "participants"}
            <RoomSidePanelParticipants {room} />
        {:else if $roomSidePanelStore.activeSection === "polls"}
            <RoomSidePanelPolls {room} {closeOnTimelineFocus} />
        {:else}
            <RoomSidePanelSettings {room} />
        {/if}
    </div>
</div>
