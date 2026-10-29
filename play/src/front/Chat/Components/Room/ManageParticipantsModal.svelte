<script lang="ts">
    import { fade } from "svelte/transition";
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import type { ChatRoomMembershipManagement, ChatRoomModeration } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import SelectMatrixUser from "../SelectMatrixUser.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import Alert from "../../../Components/UI/Alert.svelte";
    import RoomParticipant from "./RoomParticipant.svelte";
    import { IconLoader, IconLink } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        room: ChatRoomMembershipManagement & ChatRoomModeration;
    }

    let { isOpen, room }: Props = $props();
    let members = $derived(room.members);

    let invitations: { value: string; label: string }[] = $state([]);
    let sendingInvitationsToRoom = $state(false);
    let loadingMembers = $state(true);
    let invitationToRoomError: string | undefined = $state(undefined);
    let roomIdCopied = $state(false);
    let membersLoadingError: string | undefined = $state(undefined);

    let hasPermissionToInvite = $derived(room.hasPermissionTo("invite"));
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

    // One request per person, so that one failure does not hide who was invited: those who could not be
    // invited stay selected, named in an error that stays until the next try.
    async function sendInvitations() {
        sendingInvitationsToRoom = true;
        invitationToRoomError = undefined;
        const results = await Promise.allSettled(invitations.map((invitation) => room.inviteUsers([invitation.value])));
        const failed = invitations.filter((_, index) => results[index].status === "rejected");
        results.forEach((result) => {
            if (result.status === "rejected") console.error(result.reason);
        });
        if (failed.length < invitations.length) {
            notificationPlayingStore.playNotification($LL.chat.manageRoomUsers.sendInvitationsSuccessNotification());
        }
        if (failed.length > 0) {
            invitationToRoomError = $LL.chat.manageRoomUsers.invitationsFailed({
                names: failed.map((invitation) => invitation.label).join(", "),
            });
        }
        invitations = failed;
        sendingInvitationsToRoom = false;
    }

    function copyRoomId() {
        navigator.clipboard
            .writeText(room.id)
            .then(() => {
                roomIdCopied = true;
                setTimeout(() => (roomIdCopied = false), 2000);
            })
            .catch((error) => console.error(error));
    }

    function handleSelectMatrixUserError(error: string) {
        invitationToRoomError = error;
    }

    let sortedMembers = $derived([...$members].sort((a, b) => get(a.name).localeCompare(get(b.name))));
    let memberSections = $derived(
        [
            { title: $LL.chat.manageRoomUsers.sectionJoined(), memberships: ["join"] },
            { title: $LL.chat.manageRoomUsers.sectionInvited(), memberships: ["invite", "knock"] },
            { title: $LL.chat.manageRoomUsers.sectionLeft(), memberships: ["leave", "ban"] },
        ]
            .map((section) => ({
                ...section,
                members: sortedMembers.filter((member) => section.memberships.includes(get(member.membership))),
            }))
            .filter((section) => section.members.length > 0),
    );
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1 class="text-lg font-semibold tracking-tight sm:text-xl">{$LL.chat.manageRoomUsers.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full max-w-full flex flex-col gap-5 px-1 sm:px-0" data-testid="inviteParticipantsModalContent">
            <button
                type="button"
                data-testid="roomID"
                class="group flex w-full max-w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-xs text-white/70 transition hover:border-white/20 hover:bg-white/[0.07]"
                onclick={copyRoomId}
            >
                <span class="line-clamp-2 flex-1 text-center"
                    >{roomIdCopied
                        ? $LL.chat.matrixSettings.copied()
                        : $LL.chat.manageRoomUsers.roomID({ roomId: room.id })}</span
                >
                <IconLink class="h-4 w-4 shrink-0 opacity-50 transition group-hover:opacity-90" aria-hidden="true" />
            </button>

            {#if loadingMembers}
                <div class="flex flex-col items-center justify-center gap-3 py-10">
                    <div class="animate-[spin_2s_linear_infinite] text-white/80">
                        <IconLoader font-size="2em" />
                    </div>
                    <p class="text-sm text-white/60">{$LL.chat.loadingUsers()}</p>
                </div>
            {:else if membersLoadingError}
                <div class="flex flex-col items-center justify-center gap-3 py-8">
                    <p class="text-sm text-red-100">{$LL.chat.manageRoomUsers.error()} : {membersLoadingError}</p>
                    <Button variant="secondary" onclick={loadMembers}>
                        {$LL.chat.load()}
                    </Button>
                </div>
            {:else if sendingInvitationsToRoom}
                <div class="flex flex-col items-center justify-center gap-3 py-10">
                    <div class="animate-[spin_2s_linear_infinite] text-white/80">
                        <IconLoader font-size="2em" />
                    </div>
                    <p class="text-sm text-white/60">{$LL.chat.loading()}</p>
                </div>
            {:else}
                {#if invitationToRoomError}
                    <div transition:fade>
                        <Alert variant="danger" class="w-full">{invitationToRoomError}</Alert>
                    </div>
                {/if}

                {#if $hasPermissionToInvite}
                    <section class="flex flex-col gap-2">
                        <h2 class="text-xs font-medium uppercase tracking-wide text-white/45">
                            {$LL.chat.manageRoomUsers.invitations()}
                        </h2>
                        <SelectMatrixUser
                            onerror={handleSelectMatrixUserError}
                            bind:value={invitations}
                            placeholder={$LL.chat.createRoom.users()}
                        />
                    </section>
                {/if}

                <div class="manage-participants-scroll flex max-h-[min(22rem,55vh)] flex-col gap-4 overflow-y-auto">
                    {#each memberSections as section (section.title)}
                        <section class="flex min-h-0 flex-col gap-2">
                            <h2 class="m-0 text-xs font-medium uppercase tracking-wide text-white/45">
                                {section.title} · {section.members.length}
                            </h2>
                            <ul
                                class="list-none divide-y divide-white/10 rounded-2xl border border-white/10 bg-transparent p-0 m-0"
                            >
                                {#each section.members as member (member.id)}
                                    <li class="px-1 py-0.5 sm:px-2">
                                        <RoomParticipant {member} {room} />
                                    </li>
                                {/each}
                            </ul>
                        </section>
                    {/each}
                </div>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        {#if sendingInvitationsToRoom}
            <p class="text-sm text-white/70">{$LL.chat.loading()}</p>
        {:else}
            <Button variant="secondary" class="flex-1" onclick={() => modals.close()}>
                {$LL.chat.manageRoomUsers.buttons.close()}
            </Button>
            {#if $hasPermissionToInvite}
                <Button
                    dataTestId="createRoomButton"
                    class="disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1"
                    disabled={invitations === undefined || invitations.length === 0}
                    onclick={sendInvitations}
                    >{$LL.chat.manageRoomUsers.buttons.sendInvitations()}
                </Button>
            {/if}
        {/if}
    {/snippet}
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
