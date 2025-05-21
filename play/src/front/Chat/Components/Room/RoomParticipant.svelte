<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import {
        ChatRoomMember,
        ChatRoomMembership,
        ChatRoomModeration,
        ChatPermissionLevel,
    } from "../../Connection/ChatConnection";
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
                console.error(e);
                Sentry.captureMessage(`Failed to ban user : ${e}`);
            })
            .finally(() => {
                banInProgress = false;
            });
    };

    const unbanUser = () => {
        unbanInProgress = true;

        room.unban(id)
            .catch((e) => {
                console.error(e);
                Sentry.captureMessage(`Failed to unban user : ${e}`);
            })
            .finally(() => {
                unbanInProgress = false;
            });
    };

    const kickUser = () => {
        kickInProgress = true;
        room.kick(id)
            .catch((e) => {
                console.error(e);
                Sentry.captureMessage(`Failed to kick user : ${e}`);
            })
            .finally(() => {
                kickInProgress = false;
            });
    };

    const inviteUser = () => {
        inviteInProgress = true;
        room.inviteUsers([id])
            .catch((e) => {
                console.error(e);
                Sentry.captureMessage(`Failed to invite user : ${e}`);
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
                Sentry.captureMessage("Failed to get icon for membership :  " + membership);
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

    const hasPermissionToInvite = room.hasPermissionTo("invite", member);
    const hasPermissionToKick = room.hasPermissionTo("kick", member);
    const hasPermissionToBan = room.hasPermissionTo("ban", member);

    $: availableRoles = room.canModifyRoleOf($permissionLevel) ? room.getAllowedRolesToAssign() : [];
</script>

<tr data-testid={`${id}-participant`}>
    <td><p class="m-0 p-0 text-center text-ellipsis overflow-hidden max-w-[10rem]">{$name}</p></td>
    <td>
        <div class="flex gap-2 content-center justify-center">
            <p
                class="max-h-min m-0 ml-1 px-2 py-1 rounded-3xl min-w-[6rem] text-center content-center flex items-center justify-center border border-solid
                {$membership === 'join' ? 'bg-success-900/20 border-success-900/30' : ''}
                {$membership === 'invite' ? 'bg-warning-900/20 border-warning-900/30' : ''}
                {$membership === 'ban' || $membership === 'leave' ? 'bg-danger-900/20 border-danger-900/30' : ''}"
                data-testid={`${id}-membership`}
            >
                <svelte:component this={getIconForMembership($membership)} />
                {getTranslatedMembership($membership)}
            </p>
        </div></td
    >
    <td>
        <div class="flex items-center justify-center h-full w-full">
            <select
                value={$permissionLevel}
                on:change={onPermissionLevelChange}
                name="permissionLevel"
                id="permissionLevel"
                disabled={availableRoles.length === 0 || $membership !== "join"}
                data-testid={`${id}-permissionLevel`}
                class="border-light-purple border border-solid rounded-xl mb-0 w-full"
            >
                {#if availableRoles.length > 0}
                    {#each availableRoles as permissionLevelOption (permissionLevelOption)}
                        <option value={permissionLevelOption}
                            >{getTranslatedPermissionLevel(permissionLevelOption)}
                        </option>
                    {/each}
                {:else}
                    <option value={$permissionLevel}>{getTranslatedPermissionLevel($permissionLevel)}</option>
                {/if}
            </select>
        </div>
    </td>
    <td>
        <div class="flex gap-2 content-center justify-center">
            {#if $hasPermissionToInvite && $membership === "leave"}
                <button
                    class="max-h-min m-0 p-2 py-1 bg-success-900/20 hover:bg-success-900/50 rounded-sm"
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
            {#if $hasPermissionToKick && $membership !== "leave" && $membership !== "ban"}
                <button
                    class="max-h-min m-0 p-2 py-1 bg-warning-900/20 hover:bg-warning-900/50 rounded-sm"
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
            {#if $hasPermissionToBan}
                {#if $membership === "ban"}
                    <button
                        disabled={disableModerationButton}
                        class="max-h-min m-0 p-2 py-1 bg-success-900/20 hover:bg-success-900/50 rounded-sm"
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
                        class="max-h-min m-0 p-2 py-1 bg-danger-900/20 hover:bg-danger-900/50 rounded-sm"
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
    </td>
</tr>
