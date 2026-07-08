<script lang="ts">
    import { defaultColor } from "@workadventure/shared-utils";
    import { get, readable } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import { navChat } from "../../Stores/ChatStore";
    import type {
        ChatPollItem,
        ChatQuestionItem,
        ChatRoomSidePanelHydrationState,
        ProximityChatSidePanelRoom,
    } from "../../Connection/ChatConnection";
    import { roomSidePanelStore, type RoomSidePanelSection } from "../../Stores/RoomSidePanelStore";
    import Avatar from "../Avatar.svelte";
    import { createQuestionStateRowsStore } from "./QuestionStateRowsStore";
    import {
        IconBellOff,
        IconCheckList,
        IconHelpCircle,
        IconLoader,
        IconUnMute,
        IconUserPlus,
        IconUsersGroup,
    } from "@wa-icons";

    interface Props {
        room: ProximityChatSidePanelRoom;
    }

    let { room }: Props = $props();

    const emptyPollItems = readable<readonly ChatPollItem[]>([]);
    const emptyQuestionItems = readable<readonly ChatQuestionItem[]>([]);
    const emptyUnreadQuestionCount = readable(0);
    const readyHydrationState = readable<ChatRoomSidePanelHydrationState>({ status: "ready" });

    let roomName = $derived(room.name);
    let participants = $derived(room.currentMeetingParticipantsStore);
    let pollItems = $derived(room.pollItems ?? emptyPollItems);
    let questionItems = $derived(room.qaItems ?? emptyQuestionItems);
    let questionRowsStore = $derived(createQuestionStateRowsStore(questionItems));
    let questionRows = $derived($questionRowsStore);
    let unreadQuestionCount = $derived(room.unreadQuestionCount ?? emptyUnreadQuestionCount);
    let pollCatalogueHydrationState = $derived(room.pollCatalogueHydrationState ?? readyHydrationState);
    let areNotificationsMuted = $derived(room.areNotificationsMuted);
    let avatarColorStore = $derived(room.avatarFallbackColor);
    let openPollCount = $derived($pollItems.filter((poll) => !get(poll.state).isEnded).length);
    let openQuestionCount = $derived(questionRows.filter(({ state }) => !state.isAnswered).length);
    let pollCardValue = $derived(`${$pollItems.length} · ${openPollCount} ${$LL.chat.poll.kind.open()}`);
    let questionCardValue = $derived(`${questionRows.length} · ${openQuestionCount} ${$LL.chat.question.openStatus()}`);
    let isPollCatalogueLoading = $derived(
        $pollCatalogueHydrationState.status === "loading" || $pollCatalogueHydrationState.status === "idle",
    );

    function openSection(section: RoomSidePanelSection) {
        roomSidePanelStore.setActiveSection(section);
    }

    function openInvite() {
        navChat.switchToUserList();
    }

    function toggleMute() {
        if ($areNotificationsMuted) {
            room.unmuteNotification().catch(() => console.error("Failed to unmute proximity chat"));
            return;
        }

        room.muteNotification().catch(() => console.error("Failed to mute proximity chat"));
    }
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="proximityRoomSidePanelHome">
    <div class="border border-solid border-x-0 border-t-0 border-white/10 px-4 py-5">
        <div class="flex items-center gap-3">
            <div class="relative shrink-0">
                <Avatar
                    compact
                    pictureStore={room.pictureStore}
                    fallbackName={$roomName}
                    color={$avatarColorStore ?? defaultColor}
                />
            </div>

            <div class="min-w-0 flex-1">
                <div class="truncate text-lg font-bold text-white">{$roomName}</div>
                <div class="mt-1 flex flex-wrap gap-1.5 text-xs text-white/65">
                    <span class="rounded-full bg-white/10 px-2 py-0.5">
                        {$LL.chat.proximity()}
                    </span>
                </div>
            </div>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-3">
        <div class="grid grid-cols-2 gap-2">
            <button
                type="button"
                class="m-0 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition-colors hover:bg-white/[0.08]"
                data-testid="proximityRoomSidePanelHomeParticipants"
                onclick={() => openSection("participants")}
            >
                <IconUsersGroup font-size={18} />
                <div class="mt-2 text-sm font-semibold">{$LL.chat.roomPanel.sections.participants()}</div>
                <div class="mt-1 text-xs text-white/55">{$participants.length}</div>
            </button>

            <button
                type="button"
                class="m-0 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition-colors hover:bg-white/[0.08]"
                data-testid="proximityRoomSidePanelHomePolls"
                onclick={() => openSection("polls")}
            >
                <IconCheckList font-size={18} />
                <div class="mt-2 text-sm font-semibold">{$LL.chat.roomPanel.sections.polls()}</div>
                <div class="mt-1 flex min-h-4 items-center text-xs text-white/55">
                    {#if isPollCatalogueLoading}
                        <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={14} />
                    {:else}
                        {pollCardValue}
                    {/if}
                </div>
            </button>

            <button
                type="button"
                class="relative m-0 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition-colors hover:bg-white/[0.08]"
                data-testid="proximityRoomSidePanelHomeQuestions"
                onclick={() => openSection("questions")}
            >
                {#if $unreadQuestionCount > 0}
                    <span
                        class="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-solid border-contrast bg-success"
                        data-testid="proximityRoomSidePanelHomeQuestionsUnreadBadge"
                    ></span>
                {/if}
                <IconHelpCircle font-size={18} />
                <div class="mt-2 text-sm font-semibold">{$LL.chat.question.title()}</div>
                <div class="mt-1 text-xs text-white/55">{questionCardValue}</div>
            </button>
        </div>

        <div class="mt-3 flex flex-col gap-2">
            <button
                type="button"
                class="m-0 flex items-center gap-2 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
                data-testid="proximityRoomSidePanelHomeInvite"
                onclick={openInvite}
            >
                <IconUserPlus font-size={17} />
                {$LL.chat.manageRoomUsers.buttons.invite()}
            </button>

            <button
                type="button"
                class="m-0 flex items-center gap-2 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
                data-testid="proximityRoomSidePanelHomeMute"
                onclick={toggleMute}
            >
                {#if $areNotificationsMuted}
                    <IconUnMute font-size={17} />
                    {$LL.chat.roomMenu.unmuteRoom()}
                {:else}
                    <IconBellOff font-size={17} />
                    {$LL.chat.roomMenu.muteRoom()}
                {/if}
            </button>
        </div>
    </div>
</div>
