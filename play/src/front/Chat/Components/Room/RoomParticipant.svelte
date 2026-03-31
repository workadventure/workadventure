<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import type { ChatRoomMember, ChatRoomMembership, ChatRoomModeration } from "../../Connection/ChatConnection";
    import { ChatPermissionLevel } from "../../Connection/ChatConnection";
    import Select from "../../../Components/Input/Select.svelte";
    import Avatar from "../Avatar.svelte";
    import { defaultColor } from "../../Connection/Matrix/MatrixChatConnection";
    import { IconLoader, IconCheck, IconForbid, IconClock, IconPoint, IconMail, IconDoorExit } from "@wa-icons";
    export let member: ChatRoomMember;
    export let room: ChatRoomModeration;

    let banInProgress = false;
    let kickInProgress = false;
    let unbanInProgress = false;
    let inviteInProgress = false;
    let disableModerationButton = banInProgress || kickInProgress || unbanInProgress || inviteInProgress;

    $: ({ name, membership, id, permissionLevel } = member);

    function getTranslatedMembership(membership: ChatRoomMembership) {
        switch (membership) {
            case "join":
                return $LL.chat.manageRoomUsers.join();
            case "invite":
                return $LL.chat.manageRoomUsers.invite();
            case "ban":
                return $LL.chat.manageRoomUsers.ban();
            case "leave":
                return $LL.chat.manageRoomUsers.leave();
            default:
                return $LL.chat.manageRoomUsers.invite();
        }
    }

    const banUser = () => {
        banInProgress = true;
        room.ban(id)
            .catch((e) => {
                console.error("Failed to ban user:", e);
            })
            .finally(() => {
                banInProgress = false;
            });
    };

    const unbanUser = () => {
        unbanInProgress = true;

        room.unban(id)
            .catch((e) => {
                console.error("Failed to unban user:", e);
            })
            .finally(() => {
                unbanInProgress = false;
            });
    };

    const kickUser = () => {
        kickInProgress = true;
        room.kick(id)
            .catch((e) => {
                console.error("Failed to kick user:", e);
            })
            .finally(() => {
                kickInProgress = false;
            });
    };

    const inviteUser = () => {
        inviteInProgress = true;
        room.inviteUsers([id])
            .catch((e) => {
                console.error("Failed to invite user:", e);
            })
            .finally(() => {
                inviteInProgress = false;
            });
    };

    const getIconForMembership = (membership: ChatRoomMembership) => {
        switch (membership) {
            case "ban":
                return IconForbid;
            case "join":
                return IconCheck;
            case "invite":
                return IconMail;
            case "knock":
                return IconClock;
            case "leave":
                return IconDoorExit;
            default:
                console.error("Failed to get icon for membership :  " + membership);
                return IconPoint;
        }
    };

    function getTranslatedPermissionLevel(permission: ChatPermissionLevel) {
        switch (permission) {
            case ChatPermissionLevel.USER:
                return $LL.chat.manageRoomUsers.roles.USER();
            case ChatPermissionLevel.MODERATOR:
                return $LL.chat.manageRoomUsers.roles.MODERATOR();
            case ChatPermissionLevel.ADMIN:
                return $LL.chat.manageRoomUsers.roles.ADMIN();
        }
    }

    function onPermissionLevelChange(event: Event) {
        const target = event.target as HTMLSelectElement;

        if (!target) return;

        room.changePermissionLevelFor(member, target.value as ChatPermissionLevel).catch((e) => console.error(e));
    }

    const isRoomAdmin = room.isCurrentUserRoomAdmin;
    const hasPermissionToInvite = room.hasPermissionTo("invite", member);
    const hasPermissionToKick = room.hasPermissionTo("kick", member);
    const hasPermissionToBan = room.hasPermissionTo("ban", member);

    $: availableRoles = room.canModifyRoleOf($permissionLevel) ? room.getAllowedRolesToAssign() : [];
    $: permissionLevelOptions =
        availableRoles.length > 0
            ? availableRoles.map((permissionLevelOption) => ({
                  value: permissionLevelOption,
                  label: getTranslatedPermissionLevel(permissionLevelOption),
              }))
            : [{ value: $permissionLevel, label: getTranslatedPermissionLevel($permissionLevel) }];

    $: memberAvatarColorStore = member.avatarFallbackColor;

    $: isCurrentUser = id === localUserStore.getChatId();
    $: displayName = isCurrentUser ? $LL.chat.you() : $name || "?";
</script>

<div
    class="wa-chat-item group/chatItem relative mb-[1px] flex flex-col gap-3 px-2 py-2 text-md transition-all hover:bg-white hover:bg-opacity-10 hover:rounded sm:flex-row sm:items-center sm:gap-4"
    data-testid={`${id}-participant`}
>
    <div class="flex min-w-0 flex-1 items-center gap-3">
        <Avatar
            compact
            pictureStore={member.pictureStore}
            fallbackName={displayName}
            color={$memberAvatarColorStore ?? defaultColor}
        />
        <div class="min-w-0 flex-1">
            <p class="m-0 truncate text-sm font-medium leading-tight text-white/95">{displayName}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                    class="inline-flex max-h-min items-center gap-1.5 rounded-full border border-solid px-2.5 py-0.5 text-xs font-medium
                {$membership === 'join' ? 'border-success-900/30 bg-success-900/20 text-white/95' : ''}
                {$membership === 'invite' ? 'border-warning-900/30 bg-warning-900/20 text-white/95' : ''}
                {$membership === 'ban' || $membership === 'leave'
                        ? 'border-danger-900/30 bg-danger-900/20 text-white/95'
                        : ''}"
                    data-testid={`${id}-membership`}
                >
                    <svelte:component
                        this={getIconForMembership($membership)}
                        class="h-3.5 w-3.5 shrink-0 opacity-90"
                    />
                    {getTranslatedMembership($membership)}
                </span>
            </div>
        </div>
    </div>

    <div
        class="flex w-full flex-col gap-2 sm:w-auto sm:min-w-0 sm:flex-shrink-0 sm:flex-row sm:items-center sm:justify-end sm:gap-2"
    >
        <div class="w-full min-w-[10rem] sm:w-40">
            <Select
                options={permissionLevelOptions}
                value={$permissionLevel}
                onChange={onPermissionLevelChange}
                dataTestId={`${id}-permissionLevel`}
                disabled={!$isRoomAdmin || availableRoles.length === 0 || $membership !== "join"}
                outerClass="mb-0 w-full"
                extraSelectClass="border-white/20 bg-black/20 text-sm"
            />
        </div>
        <div class="flex flex-wrap justify-end gap-1.5">
            {#if $isRoomAdmin && $hasPermissionToInvite && $membership === "leave"}
                <button
                    type="button"
                    class="rounded-lg bg-success-900/25 px-2.5 py-1.5 text-xs font-medium text-white/95 transition hover:bg-success-900/45 disabled:opacity-50"
                    disabled={disableModerationButton}
                    on:click={inviteUser}
                    data-testid={`${id}-inviteButton`}
                >
                    {#if inviteInProgress}
                        <IconLoader class="animate-spin" />
                    {:else}
                        {$LL.chat.manageRoomUsers.buttons.invite()}
                    {/if}
                </button>
            {/if}
            {#if $isRoomAdmin && $hasPermissionToKick && $membership !== "leave" && $membership !== "ban"}
                <button
                    type="button"
                    class="rounded-lg bg-warning-900/25 px-2.5 py-1.5 text-xs font-medium text-white/95 transition hover:bg-warning-900/45 disabled:opacity-50"
                    disabled={disableModerationButton}
                    data-testid={`${id}-kickButton`}
                    on:click={kickUser}
                >
                    {#if kickInProgress}
                        <IconLoader class="animate-spin" />
                    {:else}
                        {$LL.chat.manageRoomUsers.buttons.kick()}
                    {/if}
                </button>
            {/if}
            {#if $isRoomAdmin && $hasPermissionToBan}
                {#if $membership === "ban"}
                    <button
                        type="button"
                        disabled={disableModerationButton}
                        class="rounded-lg bg-success-900/25 px-2.5 py-1.5 text-xs font-medium text-white/95 transition hover:bg-success-900/45 disabled:opacity-50"
                        data-testid={`${id}-unbanButton`}
                        on:click={unbanUser}
                    >
                        {#if unbanInProgress}
                            <IconLoader class="animate-spin" />
                        {:else}
                            {$LL.chat.manageRoomUsers.buttons.unban()}
                        {/if}
                    </button>
                {:else}
                    <button
                        type="button"
                        class="rounded-lg bg-danger-900/25 px-2.5 py-1.5 text-xs font-medium text-white/95 transition hover:bg-danger-900/45 disabled:opacity-50"
                        disabled={disableModerationButton}
                        on:click={banUser}
                        data-testid={`${id}-banButton`}
                    >
                        {#if banInProgress}
                            <IconLoader class="animate-spin" />
                        {:else}
                            {$LL.chat.manageRoomUsers.buttons.ban()}
                        {/if}
                    </button>
                {/if}
            {/if}
        </div>
    </div>
</div>
