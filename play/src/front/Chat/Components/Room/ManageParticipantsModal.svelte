<script lang="ts">
    import { closeModal } from "svelte-modals";
    import { fade } from "svelte/transition";
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import type { ChatRoomMembershipManagement, ChatRoomModeration } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import SelectMatrixUser from "../SelectMatrixUser.svelte";
    import RoomParticipant from "./RoomParticipant.svelte";
    import { IconLoader, IconLink } from "@wa-icons";
    export let isOpen: boolean;
    export let room: ChatRoomMembershipManagement & ChatRoomModeration;
    const members = room.members;
    const isRoomAdmin = room.isCurrentUserRoomAdmin;

    let invitations: { value: string; label: string }[] = [];
    let sendingInvitationsToRoom = false;
    let loadingMembers = true;
    let invitationToRoomError: string | undefined = undefined;
    let membersLoadingError: string | undefined = undefined;

    const hasPermissionToInvite = room.hasPermissionTo("invite");
    onMount(() => {
        loadMembers().catch((error) => console.error(error));
    });

    async function loadMembers() {
        try {
            loadingMembers = true;
            membersLoadingError = undefined;
            await room.ensureMembersInitialized();
        } catch (error) {
            console.error(error);
            membersLoadingError = error instanceof Error ? error.message : String(error);
        } finally {
            loadingMembers = false;
        }
    }

    async function inviteUsersAndCloseModalOnSuccess() {
        try {
            sendingInvitationsToRoom = true;
            await room.inviteUsers(invitations.map((invitation) => invitation.value));
            notificationPlayingStore.playNotification($LL.chat.manageRoomUsers.sendInvitationsSuccessNotification());
        } catch (error) {
            console.error(error);
            if (error instanceof Error) {
                invitationToRoomError = error.message;
            }
        } finally {
            sendingInvitationsToRoom = false;
            setTimeout(() => (invitationToRoomError = undefined), 2000);
        }
    }

    function handleSelectMatrixUserError(e: CustomEvent) {
        invitationToRoomError = e.detail.error;
    }

    $: sortedMembers = [...$members].sort((a, b) => get(a.name).localeCompare(get(b.name)));
</script>

<Popup {isOpen}>
    <h1 slot="title" class="text-lg font-semibold tracking-tight sm:text-xl">{$LL.chat.manageRoomUsers.title()}</h1>
    <div
        slot="content"
        class="w-full max-w-full flex flex-col gap-5 px-1 sm:px-0"
        data-testid="inviteParticipantsModalContent"
    >
        <button
            type="button"
            data-testid="roomID"
            class="group flex w-full max-w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-xs text-white/70 transition hover:border-white/20 hover:bg-white/[0.07]"
            on:click={() => navigator.clipboard.writeText(room.id)}
        >
            <span class="line-clamp-2 flex-1 text-center">{$LL.chat.manageRoomUsers.roomID({ roomId: room.id })}</span>
            <IconLink class="h-4 w-4 shrink-0 opacity-50 transition group-hover:opacity-90" aria-hidden="true" />
        </button>

        {#if loadingMembers}
            <div class="flex flex-col items-center justify-center gap-3 py-10">
                <div class="animate-[spin_2s_linear_infinite] text-white/80">
                    <IconLoader font-size="2em" />
                </div>
                <p class="text-sm text-white/60">{$LL.chat.createRoom.loadingCreation()}</p>
            </div>
        {:else if membersLoadingError}
            <div class="flex flex-col items-center justify-center gap-3 py-8">
                <p class="text-sm text-red-100">{$LL.chat.manageRoomUsers.error()} : {membersLoadingError}</p>
                <button type="button" class="btn btn-secondary" on:click={loadMembers}>
                    {$LL.chat.load()}
                </button>
            </div>
        {:else if sendingInvitationsToRoom}
            <div class="flex flex-col items-center justify-center gap-3 py-10">
                <div class="animate-[spin_2s_linear_infinite] text-white/80">
                    <IconLoader font-size="2em" />
                </div>
                <p class="text-sm text-white/60">{$LL.chat.createRoom.loadingCreation()}</p>
            </div>
        {:else}
            {#if invitationToRoomError}
                <div
                    transition:fade
                    class="rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-100"
                >
                    {$LL.chat.manageRoomUsers.error()} : <span class="font-medium italic">{invitationToRoomError}</span>
                </div>
            {/if}

            {#if $isRoomAdmin}
                <section class="flex flex-col gap-2">
                    <h2 class="text-xs font-medium uppercase tracking-wide text-white/45">
                        {$LL.chat.manageRoomUsers.invitations()}
                    </h2>
                    <SelectMatrixUser
                        on:error={handleSelectMatrixUserError}
                        bind:value={invitations}
                        placeholder={$LL.chat.createRoom.users()}
                    />
                </section>
            {/if}

            <section class="flex min-h-0 flex-col gap-2">
                <h2 class="text-xs font-medium uppercase tracking-wide text-white/45">
                    {$LL.chat.manageRoomUsers.participants()}
                </h2>
                <div
                    class="manage-participants-scroll max-h-[min(22rem,55vh)] overflow-y-auto rounded-2xl border border-white/10 bg-transparent"
                >
                    <ul class="list-none divide-y divide-white/10 p-0 m-0">
                        {#each sortedMembers as member (member.id)}
                            <li class="px-1 py-0.5 sm:px-2">
                                <RoomParticipant {member} {room} />
                            </li>
                        {/each}
                    </ul>
                </div>
            </section>
        {/if}
    </div>
    <svelte:fragment slot="action">
        {#if sendingInvitationsToRoom}
            <p class="text-sm text-white/70">{$LL.chat.createRoom.loadingCreation()}</p>
        {:else}
            <button type="button" class="btn btn-secondary flex-1 justify-center" on:click={closeModal}
                >{$LL.chat.manageRoomUsers.buttons.cancel()}</button
            >
            {#if $isRoomAdmin}
                <button
                    type="button"
                    data-testid="createRoomButton"
                    class="btn disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
                    disabled={invitations === undefined || invitations.length === 0 || !$hasPermissionToInvite}
                    on:click={inviteUsersAndCloseModalOnSuccess}
                    >{$LL.chat.manageRoomUsers.buttons.sendInvitations()}
                </button>
            {/if}
        {/if}
    </svelte:fragment>
</Popup>

<style>
    .manage-participants-scroll {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
    }
    .manage-participants-scroll::-webkit-scrollbar {
        width: 6px;
    }
    .manage-participants-scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 999px;
    }
</style>
