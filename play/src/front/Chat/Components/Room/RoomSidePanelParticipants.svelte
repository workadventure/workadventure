<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatRoom, ChatRoomMembershipManagement, ChatRoomModeration } from "../../Connection/ChatConnection";
    import Button from "../../../Components/UI/Button.svelte";
    import Alert from "../../../Components/UI/Alert.svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import SelectMatrixUser from "../SelectMatrixUser.svelte";
    import { rovingFocus } from "../roomRowKeyboard";
    import RoomSidePanelParticipantRow from "./RoomSidePanelParticipantRow.svelte";
    import MemberActionsMenu from "./MemberActionsMenu.svelte";
    import { IconLoader } from "@wa-icons";

    interface Props {
        room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration;
    }

    let { room }: Props = $props();

    let members = $derived(room.members);
    let canInvite = $derived(room.hasPermissionTo("invite"));

    let loadingMembers = $state(true);
    let membersLoadingError: string | undefined = $state(undefined);
    let invitations: { value: string; label: string }[] = $state([]);
    let sendingInvitations = $state(false);
    let invitationError: string | undefined = $state(undefined);
    const myId = localUserStore.getChatId();

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

    // One request per person: those invited leave the selection, those who failed stay selected and are named.
    async function sendInvitations() {
        sendingInvitations = true;
        invitationError = undefined;
        const results = await Promise.allSettled(invitations.map((invitation) => room.inviteUsers([invitation.value])));
        const failed = invitations.filter((_, index) => results[index].status === "rejected");
        results.forEach((result) => {
            if (result.status === "rejected") console.error(result.reason);
        });
        if (failed.length < invitations.length) {
            notificationPlayingStore.playNotification($LL.chat.manageRoomUsers.sendInvitationsSuccessNotification());
        }
        if (failed.length > 0) {
            invitationError = $LL.chat.manageRoomUsers.invitationsFailed({
                names: failed.map((invitation) => invitation.label).join(", "),
            });
        }
        invitations = failed;
        sendingInvitations = false;
    }

    let sortedMembers = $derived([...$members].sort((a, b) => get(a.name).localeCompare(get(b.name))));
    let joined = $derived(sortedMembers.filter((member) => get(member.membership) === "join"));
    let invited = $derived(sortedMembers.filter((member) => ["invite", "knock"].includes(get(member.membership))));
    let leftOrBanned = $derived(sortedMembers.filter((member) => ["leave", "ban"].includes(get(member.membership))));

    function statusOf(membership: string): string | undefined {
        switch (membership) {
            case "invite":
                return $LL.chat.manageRoomUsers.invite();
            case "ban":
                return $LL.chat.manageRoomUsers.ban();
            case "leave":
                return $LL.chat.manageRoomUsers.leave();
            default:
                return undefined;
        }
    }
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="roomSidePanelParticipants">
    {#if $canInvite}
        <div class="flex flex-col gap-2 border border-solid border-x-0 border-t-0 border-white/10 px-3 py-3">
            <SelectMatrixUser
                onerror={(error) => (invitationError = error)}
                bind:value={invitations}
                placeholder={$LL.chat.manageRoomUsers.invitePlaceholder()}
            />
            {#if invitations.length > 0}
                <Button
                    variant="secondary"
                    dataTestId="roomSidePanelSendInvitations"
                    disabled={sendingInvitations}
                    onclick={() => {
                        sendInvitations().catch((error) => console.error(error));
                    }}
                >
                    {#if sendingInvitations}
                        <IconLoader class="animate-spin" />
                    {/if}
                    {$LL.chat.manageRoomUsers.buttons.sendInvitations()}
                </Button>
            {/if}
            {#if invitationError}
                <Alert variant="danger" class="w-full">{invitationError}</Alert>
            {/if}
        </div>
    {/if}

    <div
        class="flex-1 overflow-y-auto px-3 py-3"
        use:rovingFocus={{ items: "[data-member-row]", arrowRightOpensMenu: true }}
    >
        {#if loadingMembers}
            <div
                class="flex flex-col items-center justify-center gap-3 py-10"
                data-testid="roomSidePanelParticipantsLoading"
            >
                <div class="animate-[spin_2s_linear_infinite] text-white/80">
                    <IconLoader font-size="2em" />
                </div>
                <p class="text-sm text-white/60">{$LL.chat.loadingUsers()}</p>
            </div>
        {:else if membersLoadingError}
            <div class="flex flex-col items-center justify-center gap-3 py-8 px-2 text-center">
                <p class="text-sm text-red-100">{$LL.chat.manageRoomUsers.error()} : {membersLoadingError}</p>
                <Button variant="secondary" onclick={() => loadMembers().catch((e) => console.error(e))}>
                    {$LL.chat.load()}
                </Button>
            </div>
        {:else if joined.length === 0}
            <div
                class="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm opacity-60"
                data-testid="roomSidePanelParticipantsEmpty"
            >
                {$LL.chat.roomPanel.participantsEmpty()}
            </div>
        {:else}
            <div class="flex flex-col gap-4">
                {#each [{ key: "joined", title: $LL.chat.manageRoomUsers.sectionJoined(), list: joined }, { key: "invited", title: $LL.chat.manageRoomUsers.sectionInvited(), list: invited }] as section (section.key)}
                    {#if section.list.length > 0}
                        <section class="flex flex-col gap-2" data-testid={`roomSidePanelMembers-${section.key}`}>
                            <h3 class="m-0 text-xs font-semibold uppercase tracking-wide text-white/50">
                                {section.title} · {section.list.length}
                            </h3>
                            {#each section.list as member (member.id)}
                                <RoomSidePanelParticipantRow {member} status={statusOf(get(member.membership))}>
                                    {#snippet actions()}
                                        {#if member.id !== myId}
                                            <MemberActionsMenu {room} {member} />
                                        {/if}
                                    {/snippet}
                                </RoomSidePanelParticipantRow>
                            {/each}
                        </section>
                    {/if}
                {/each}
                {#if leftOrBanned.length > 0}
                    <details class="flex flex-col gap-2" data-testid="roomSidePanelMembers-left">
                        <summary
                            class="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-white/50 hover:text-white/80"
                        >
                            {$LL.chat.manageRoomUsers.sectionLeft()} · {leftOrBanned.length}
                        </summary>
                        <div class="mt-2 flex flex-col gap-2">
                            {#each leftOrBanned as member (member.id)}
                                <RoomSidePanelParticipantRow {member} status={statusOf(get(member.membership))}>
                                    {#snippet actions()}
                                        <MemberActionsMenu {room} {member} />
                                    {/snippet}
                                </RoomSidePanelParticipantRow>
                            {/each}
                        </div>
                    </details>
                {/if}
            </div>
        {/if}
    </div>
</div>
