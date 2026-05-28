<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import type {
        ChatRoom,
        ChatRoomMembershipManagement,
        ChatRoomModeration,
        ChatRoomNotificationControl,
        ProximityChatSidePanelRoom,
    } from "../../Connection/ChatConnection";
    import { hasProximityChatSidePanel } from "../../Connection/ChatConnection";
    import { roomSidePanelStore, type RoomSidePanelSection } from "../../Stores/RoomSidePanelStore";
    import ThreadPanel from "./ThreadPanel.svelte";
    import RoomSidePanelParticipants from "./RoomSidePanelParticipants.svelte";
    import RoomSidePanelPolls from "./RoomSidePanelPolls.svelte";
    import RoomSidePanelHome from "./RoomSidePanelHome.svelte";
    import RoomSidePanelSettings from "./RoomSidePanelSettings.svelte";
    import ProximityRoomSidePanelHome from "./ProximityRoomSidePanelHome.svelte";
    import ProximityRoomSidePanelParticipants from "./ProximityRoomSidePanelParticipants.svelte";
    import ProximityRoomSidePanelQuestions from "./ProximityRoomSidePanelQuestions.svelte";
    import { IconChevronLeft, IconX } from "@wa-icons";

    type MatrixSidePanelRoom = ChatRoom &
        ChatRoomMembershipManagement &
        ChatRoomModeration &
        ChatRoomNotificationControl;
    type SidePanelRoom = MatrixSidePanelRoom | ProximityChatSidePanelRoom;
    type ProximityRoomSidePanelSection = "home" | "participants" | "polls" | "questions";

    interface Props {
        room: SidePanelRoom;
        showCloseButton?: boolean;
        closeOnTimelineFocus?: boolean;
    }

    let { room, showCloseButton = false, closeOnTimelineFocus = false }: Props = $props();

    function activateSection(section: RoomSidePanelSection) {
        roomSidePanelStore.setActiveSection(section);
    }

    function isProximityRoomSidePanelSection(section: RoomSidePanelSection): section is ProximityRoomSidePanelSection {
        return section === "home" || section === "participants" || section === "polls" || section === "questions";
    }

    function getMatrixSidePanelRoom(currentRoom: SidePanelRoom): MatrixSidePanelRoom | undefined {
        if (hasProximityChatSidePanel(currentRoom)) {
            return undefined;
        }

        return currentRoom;
    }

    let proximityRoom = $derived(hasProximityChatSidePanel(room) ? room : undefined);
    let matrixRoom = $derived(getMatrixSidePanelRoom(room));
    let isProximityRoom = $derived(proximityRoom !== undefined);
    let activeSection = $derived($roomSidePanelStore.activeSection);
    let displayedSection = $derived(
        isProximityRoom && !isProximityRoomSidePanelSection(activeSection) ? "home" : activeSection,
    );
    let shouldShowCloseButton = $derived(showCloseButton || (!isProximityRoom && activeSection === "settings"));
    $effect(() => {
        if (!isProximityRoom || displayedSection === activeSection) {
            return;
        }
        roomSidePanelStore.setActiveSection("home");
    });
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="roomSidePanel">
    {#if displayedSection !== "home" || shouldShowCloseButton}
        <div class="border border-solid border-x-0 border-t-0 border-white/10 px-3 py-3">
            <div class="flex items-center gap-2">
                {#if displayedSection !== "home"}
                    <button
                        type="button"
                        class="m-0 flex aspect-square h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-solid border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                        data-testid="roomSidePanelBackButton"
                        title={$LL.chat.roomPanel.back()}
                        aria-label={$LL.chat.roomPanel.back()}
                        onclick={() => activateSection("home")}
                    >
                        <IconChevronLeft font-size={18} />
                    </button>
                    <div class="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-widest text-white/75">
                        {#if displayedSection === "threads"}
                            {$LL.chat.roomPanel.sections.threads()}
                        {:else if displayedSection === "polls"}
                            {$LL.chat.roomPanel.sections.polls()}
                        {:else if displayedSection === "participants"}
                            {$LL.chat.roomPanel.sections.participants()}
                        {:else if displayedSection === "questions"}
                            Questions
                        {:else if displayedSection === "settings"}
                            {$LL.chat.roomPanel.sections.settings()}
                        {/if}
                    </div>
                {:else}
                    <div class="min-w-0 flex-1"></div>
                {/if}
                {#if shouldShowCloseButton}
                    <button
                        type="button"
                        class="m-0 flex aspect-square h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-solid border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                        data-testid="closeRoomSidePanelButton"
                        title={$LL.chat.roomPanel.toggleClose()}
                        aria-label={$LL.chat.roomPanel.toggleClose()}
                        onclick={() => roomSidePanelStore.close()}
                    >
                        <IconX font-size={18} />
                    </button>
                {/if}
            </div>
        </div>
    {/if}

    <div class="min-h-0 flex-1 overflow-hidden">
        {#key `${room.id}-${displayedSection}`}
            {#if proximityRoom}
                {#if displayedSection === "participants"}
                    <ProximityRoomSidePanelParticipants room={proximityRoom} />
                {:else if displayedSection === "polls"}
                    <RoomSidePanelPolls room={proximityRoom} {closeOnTimelineFocus} />
                {:else if displayedSection === "questions"}
                    <ProximityRoomSidePanelQuestions room={proximityRoom} />
                {:else}
                    <ProximityRoomSidePanelHome room={proximityRoom} />
                {/if}
            {:else if matrixRoom}
                {#if displayedSection === "home"}
                    <RoomSidePanelHome room={matrixRoom} />
                {:else if displayedSection === "threads"}
                    <ThreadPanel room={matrixRoom} />
                {:else if displayedSection === "participants"}
                    <RoomSidePanelParticipants room={matrixRoom} />
                {:else if displayedSection === "polls"}
                    <RoomSidePanelPolls room={matrixRoom} {closeOnTimelineFocus} />
                {:else}
                    <RoomSidePanelSettings room={matrixRoom} />
                {/if}
            {/if}
        {/key}
    </div>
</div>
