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
                return $LL.chat.manageRoomUsers.roles.USER;
            case ChatPermissionLevel.MODERATOR:
                return $LL.chat.manageRoomUsers.roles.MODERATOR;
            case ChatPermissionLevel.ADMIN:
                return $LL.chat.manageRoomUsers.roles.ADMIN;
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

    $: availableRoles =
        $permissionLevel === ChatPermissionLevel.ADMIN && room.canModifyRoleOf() ? [] : room.getAllowedRolesToAssign();
</script>

<li class="tw-flex tw-my-1 tw-justify-between tw-items-center">
    <p class="tw-m-0 tw-p-0">{$name}</p>
    <div class="tw-flex tw-gap-2 tw-content-center">
        {#if $hasPermissionToInvite && $membership === "leave"}
            <button
                class="tw-max-h-min tw-m-0 tw-px-2 tw-py-1 tw-bg-green-500 tw-rounded-md"
                disabled={disableModerationButton}
                on:click={inviteUser}
            >
                {#if inviteInProgress}
                    <IconLoader class="tw-animate-spin" />
                {:else}
                    {$LL.chat.manageRoomUsers.buttons.invite()}
                {/if}
            </button>
        {/if}
        {#if $hasPermissionToKick && $membership !== "leave" && $membership !== "ban"}
            <button
                class="tw-max-h-min tw-m-0 tw-px-2 tw-py-1 tw-bg-orange-500 tw-rounded-md"
                disabled={disableModerationButton}
                on:click={kickUser}
            >
                {#if kickInProgress}
                    <IconLoader class="tw-animate-spin" />
                {:else}
                    {$LL.chat.manageRoomUsers.buttons.kick()}
                {/if}
            </button>
        {/if}
        {#if $hasPermissionToBan}
            {#if $membership === "ban"}
                <button
                    disabled={disableModerationButton}
                    class="tw-max-h-min tw-m-0 tw-px-2 tw-py-1 tw-bg-green-500 tw-rounded-md"
                    on:click={unbanUser}
                >
                    {#if unbanInProgress}
                        <IconLoader class="tw-animate-spin" />
                    {:else}
                        {$LL.chat.manageRoomUsers.buttons.unban()}
                    {/if}
                </button>
            {:else}
                <button
                    class="tw-max-h-min tw-m-0 tw-px-2 tw-py-1 tw-bg-red-500 tw-rounded-md"
                    disabled={disableModerationButton}
                    on:click={banUser}
                >
                    {#if banInProgress}
                        <IconLoader class="tw-animate-spin" />
                    {:else}
                        {$LL.chat.manageRoomUsers.buttons.ban()}
                    {/if}
                </button>
            {/if}
        {/if}
        <p
            class="tw-max-h-min tw-m-0 tw-ml-4 tw-px-2 tw-py-1 tw-bg-green-500 tw-rounded-3xl tw-min-w-[6rem] tw-text-center tw-content-center"
            class:tw-bg-orange-500={$membership === "invite"}
            class:tw-bg-red-500={$membership === "ban" || $membership === "leave"}
        >
            <svelte:component this={getIconForMembership($membership)} />
            {getTranslatedMembership($membership)}
        </p>
        {#if availableRoles.length > 0}
            <select
                value={$permissionLevel}
                on:change={onPermissionLevelChange}
                name="permissionLevel"
                id="permissionLevel"
            >
                {#each availableRoles as permissionLevelOption (permissionLevelOption)}
                    <option value={permissionLevelOption}>{getTranslatedPermissionLevel(permissionLevelOption)}</option>
                {/each}
            </select>
        {/if}
    </div>
</li>
