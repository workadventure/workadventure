<script lang="ts">
    import { EventType } from "matrix-js-sdk";
    import { get, readable } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import type {
        ChatRoom,
        ChatRoomMembershipManagement,
        ChatRoomModeration,
        ChatRoomPermissionsState,
        ChatRoomPrivacyState,
        ChatRoomSettingsAccess,
        ChatRoomSettingsManagement,
        historyVisibility,
    } from "../../Connection/ChatConnection";
    import { ChatPermissionLevel, historyVisibilityOptions } from "../../Connection/ChatConnection";

    interface Props {
        room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration & ChatRoomSettingsManagement;
    }

    let { room }: Props = $props();

    const emptyPrivacyState = readable<ChatRoomPrivacyState>({});
    const permissionOptions = [
        { value: ChatPermissionLevel.USER, label: get(LL).chat.manageRoomUsers.roles.USER() },
        { value: ChatPermissionLevel.MODERATOR, label: get(LL).chat.manageRoomUsers.roles.MODERATOR() },
        { value: ChatPermissionLevel.ADMIN, label: get(LL).chat.manageRoomUsers.roles.ADMIN() },
    ];
    const permissionRows: { key: keyof ChatRoomPermissionsState; label: () => string }[] = [
        { key: "sendMessages", label: () => get(LL).chat.roomPanel.settings.permissions.sendMessages() },
        { key: "sendReactions", label: () => get(LL).chat.roomPanel.settings.permissions.sendReactions() },
        { key: "redactOwnMessages", label: () => get(LL).chat.roomPanel.settings.permissions.redactOwnMessages() },
        { key: "redactOtherMessages", label: () => get(LL).chat.roomPanel.settings.permissions.redactOtherMessages() },
        { key: "kickUsers", label: () => get(LL).chat.roomPanel.settings.permissions.kickUsers() },
        { key: "banUsers", label: () => get(LL).chat.roomPanel.settings.permissions.banUsers() },
        { key: "inviteUsers", label: () => get(LL).chat.roomPanel.settings.permissions.inviteUsers() },
        { key: "changeSettings", label: () => get(LL).chat.roomPanel.settings.permissions.changeSettings() },
        { key: "changeRoomName", label: () => get(LL).chat.roomPanel.settings.permissions.changeRoomName() },
        { key: "changeRoomTopic", label: () => get(LL).chat.roomPanel.settings.permissions.changeRoomTopic() },
        {
            key: "changeHistoryVisibility",
            label: () => get(LL).chat.roomPanel.settings.permissions.changeHistoryVisibility(),
        },
        { key: "changeAccess", label: () => get(LL).chat.roomPanel.settings.permissions.changeAccess() },
        { key: "changePermissions", label: () => get(LL).chat.roomPanel.settings.permissions.changePermissions() },
    ];

    let roomType = $derived(room.type);
    let isEncrypted = $derived(room.isEncrypted);
    let privacyState = $derived(room.privacyState ?? emptyPrivacyState);
    let roomName = $derived(room.name);
    let roomTopic = $derived(room.topic);
    let roomPermissions = $derived(room.permissionsState);
    let canEditName = $derived(room.hasPermissionForRoomStateEvent(EventType.RoomName));
    let canEditTopic = $derived(room.hasPermissionForRoomStateEvent(EventType.RoomTopic));
    let canEditAccess = $derived(room.hasPermissionForRoomStateEvent(EventType.RoomJoinRules));
    let canEditHistory = $derived(room.hasPermissionForRoomStateEvent(EventType.RoomHistoryVisibility));
    let canEditPermissions = $derived(room.hasPermissionForRoomStateEvent(EventType.RoomPowerLevels));

    let settingsDirty = $state(false);
    let permissionsDirty = $state(false);
    let settingsSaving = $state(false);
    let saveError: string | undefined = $state();
    let editableName = $state("");
    let editableTopic = $state("");
    let editableAccess: ChatRoomSettingsAccess = $state("invite");
    let editableHistoryVisibility: historyVisibility = $state("joined");
    let editablePermissions: ChatRoomPermissionsState = $state({
        sendMessages: ChatPermissionLevel.USER,
        sendReactions: ChatPermissionLevel.USER,
        redactOwnMessages: ChatPermissionLevel.USER,
        redactOtherMessages: ChatPermissionLevel.MODERATOR,
        kickUsers: ChatPermissionLevel.MODERATOR,
        banUsers: ChatPermissionLevel.MODERATOR,
        inviteUsers: ChatPermissionLevel.USER,
        changeSettings: ChatPermissionLevel.ADMIN,
        changeRoomName: ChatPermissionLevel.MODERATOR,
        changeRoomTopic: ChatPermissionLevel.MODERATOR,
        changeHistoryVisibility: ChatPermissionLevel.ADMIN,
        changeAccess: ChatPermissionLevel.ADMIN,
        changePermissions: ChatPermissionLevel.ADMIN,
    });

    let restrictedRoomId = $derived($privacyState.restrictedRoomId);
    let canUseRestrictedAccess = $derived(restrictedRoomId !== undefined);
    let hasAnyEditableField = $derived(
        $canEditName || $canEditTopic || $canEditAccess || $canEditHistory || $canEditPermissions,
    );

    $effect.pre(() => {
        if (settingsDirty) {
            return;
        }
        editableName = $roomName;
        editableTopic = $roomTopic;
        editableAccess = $privacyState.joinRule === "restricted" ? "restricted" : "invite";
        editableHistoryVisibility = historyVisibilityOptions.includes(
            $privacyState.historyVisibility as historyVisibility
        )
            ? ($privacyState.historyVisibility as historyVisibility)
            : "joined";
    });

    $effect.pre(() => {
        if (permissionsDirty) {
            return;
        }
        editablePermissions = { ...$roomPermissions };
    });

    function getHistoryTranslation(historyVisibilityOption: historyVisibility) {
        switch (historyVisibilityOption) {
            case "world_readable":
                return get(LL).chat.createRoom.historyVisibility.world_readable();
            case "invited":
                return get(LL).chat.createRoom.historyVisibility.invited();
            case "joined":
                return get(LL).chat.createRoom.historyVisibility.joined();
        }
    }

    function getJoinRuleLabel(joinRule: string | undefined) {
        switch (joinRule) {
            case "public":
                return get(LL).chat.roomPanel.settings.joinRules.public();
            case "invite":
                return get(LL).chat.roomPanel.settings.joinRules.invite();
            case "restricted":
                return get(LL).chat.roomPanel.settings.joinRules.restricted();
            case "knock":
                return get(LL).chat.roomPanel.settings.joinRules.knock();
            default:
                return joinRule ?? get(LL).chat.roomPanel.settings.unknown();
        }
    }

    function markSettingsDirty() {
        settingsDirty = true;
        saveError = undefined;
    }

    function markPermissionsDirty() {
        permissionsDirty = true;
        saveError = undefined;
    }

    function clearDirtyFlagsAfterSave(clearSettings: boolean, clearPermissions: boolean) {
        if (clearSettings) {
            settingsDirty = false;
        }
        if (clearPermissions) {
            permissionsDirty = false;
        }
    }

    async function saveSettings() {
        const shouldSaveSettings = settingsDirty;
        const shouldSavePermissions = permissionsDirty && $canEditPermissions;

        try {
            saveError = undefined;
            settingsSaving = true;
            if (shouldSaveSettings) {
                await room.updateRoomSettings({
                    name: $canEditName ? editableName : undefined,
                    topic: $canEditTopic ? editableTopic : undefined,
                    access: $canEditAccess ? editableAccess : undefined,
                    restrictedRoomId,
                    historyVisibility: $canEditHistory ? editableHistoryVisibility : undefined,
                });
            }
            if (shouldSavePermissions) {
                await room.updateRoomPowerLevels(editablePermissions);
            }
            clearDirtyFlagsAfterSave(shouldSaveSettings, shouldSavePermissions);
            notificationPlayingStore.playNotification($LL.chat.roomPanel.settings.saveSuccess());
        } catch (error) {
            console.error("Failed to save Matrix room settings", error);
            saveError = error instanceof Error ? error.message : get(LL).chat.roomPanel.settings.saveError();
        } finally {
            settingsSaving = false;
        }
    }
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="roomSidePanelSettings">
    <div class="flex-1 overflow-y-auto px-3 py-3">
        <div class="flex flex-col gap-2 text-sm">
            <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                <div class="text-xs font-semibold uppercase text-white/45">
                    {$LL.chat.roomPanel.settings.roomType()}
                </div>
                <div class="mt-1 text-white">
                    {$roomType === "direct"
                        ? $LL.chat.roomPanel.home.directRoom()
                        : $LL.chat.roomPanel.home.groupRoom()}
                </div>
            </div>

            <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                <div class="text-xs font-semibold uppercase text-white/45">
                    {$LL.chat.roomPanel.settings.encryption()}
                </div>
                <div class="mt-1 text-white">
                    {$isEncrypted ? $LL.chat.roomPanel.home.encrypted() : $LL.chat.roomPanel.home.notEncrypted()}
                </div>
            </div>

            {#if hasAnyEditableField}
                <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                    <div class="text-xs font-semibold uppercase text-white/45">{$LL.chat.createRoom.name()}</div>
                    <input
                        class="mt-2 w-full rounded border border-solid border-white/10 bg-black/20 px-3 py-2 text-sm text-white disabled:opacity-60"
                        data-testid="roomSettingsNameInput"
                        bind:value={editableName}
                        disabled={!$canEditName || settingsSaving}
                        oninput={markSettingsDirty}
                    />
                </div>

                <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                    <div class="text-xs font-semibold uppercase text-white/45">
                        {$LL.chat.roomPanel.settings.topic()}
                    </div>
                    <input
                        class="mt-2 w-full rounded border border-solid border-white/10 bg-black/20 px-3 py-2 text-sm text-white disabled:opacity-60"
                        data-testid="roomSettingsTopicInput"
                        bind:value={editableTopic}
                        disabled={!$canEditTopic || settingsSaving}
                        oninput={markSettingsDirty}
                    />
                </div>

                <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                    <div class="text-xs font-semibold uppercase text-white/45">
                        {$LL.chat.roomPanel.settings.joinRule()}
                    </div>
                    <select
                        class="mt-2 w-full rounded border border-solid border-white/10 bg-black/20 px-3 py-2 text-sm text-white disabled:opacity-60"
                        data-testid="roomSettingsAccessSelect"
                        bind:value={editableAccess}
                        disabled={!$canEditAccess || settingsSaving}
                        onchange={markSettingsDirty}
                    >
                        <option value="invite">{$LL.chat.roomPanel.settings.joinRules.invite()}</option>
                        <option value="restricted" disabled={!canUseRestrictedAccess}>
                            {$LL.chat.roomPanel.settings.joinRules.restricted()}
                        </option>
                    </select>
                    {#if !canUseRestrictedAccess}
                        <div class="mt-2 text-xs text-white/45">
                            {$LL.chat.roomPanel.settings.restrictedUnavailable()}
                        </div>
                    {/if}
                </div>

                <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                    <div class="text-xs font-semibold uppercase text-white/45">
                        {$LL.chat.createRoom.historyVisibility.label()}
                    </div>
                    <select
                        class="mt-2 w-full rounded border border-solid border-white/10 bg-black/20 px-3 py-2 text-sm text-white disabled:opacity-60"
                        data-testid="roomSettingsHistoryVisibilitySelect"
                        bind:value={editableHistoryVisibility}
                        disabled={!$canEditHistory || settingsSaving}
                        onchange={markSettingsDirty}
                    >
                        {#each historyVisibilityOptions as historyVisibilityOption (historyVisibilityOption)}
                            <option value={historyVisibilityOption}
                                >{getHistoryTranslation(historyVisibilityOption)}</option
                            >
                        {/each}
                    </select>
                </div>

                {#if restrictedRoomId}
                    <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                        <div class="text-xs font-semibold uppercase text-white/45">
                            {$LL.chat.roomPanel.settings.restrictedTo()}
                        </div>
                        <div class="mt-1 break-all text-white">{restrictedRoomId}</div>
                    </div>
                {/if}

                <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                    <div class="text-xs font-semibold uppercase text-white/45">
                        {$LL.chat.roomPanel.settings.permissions.title()}
                    </div>
                    <div class="mt-3 flex flex-col gap-2">
                        {#each permissionRows as permissionRow (permissionRow.key)}
                            <label class="flex items-center justify-between gap-3 text-white/80">
                                <span class="min-w-0 flex-1">{permissionRow.label()}</span>
                                <select
                                    class="w-36 rounded border border-solid border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white disabled:opacity-60"
                                    data-testid={`roomPermission-${permissionRow.key}`}
                                    bind:value={editablePermissions[permissionRow.key]}
                                    disabled={!$canEditPermissions || settingsSaving}
                                    onchange={markPermissionsDirty}
                                >
                                    {#each permissionOptions as permissionOption (permissionOption.value)}
                                        <option value={permissionOption.value}>{permissionOption.label}</option>
                                    {/each}
                                </select>
                            </label>
                        {/each}
                    </div>
                </div>
            {:else}
                <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                    <div class="text-xs font-semibold uppercase text-white/45">
                        {$LL.chat.roomPanel.settings.joinRule()}
                    </div>
                    <div class="mt-1 text-white">{getJoinRuleLabel($privacyState.joinRule)}</div>
                </div>

                <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                    <div class="text-xs font-semibold uppercase text-white/45">
                        {$LL.chat.createRoom.historyVisibility.label()}
                    </div>
                    <div class="mt-1 text-white">
                        {#if $privacyState.historyVisibility === "world_readable"}
                            {$LL.chat.createRoom.historyVisibility.world_readable()}
                        {:else if $privacyState.historyVisibility === "invited"}
                            {$LL.chat.createRoom.historyVisibility.invited()}
                        {:else if $privacyState.historyVisibility === "joined"}
                            {$LL.chat.createRoom.historyVisibility.joined()}
                        {:else}
                            {$privacyState.historyVisibility ?? $LL.chat.roomPanel.settings.unknown()}
                        {/if}
                    </div>
                </div>

                {#if restrictedRoomId}
                    <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                        <div class="text-xs font-semibold uppercase text-white/45">
                            {$LL.chat.roomPanel.settings.restrictedTo()}
                        </div>
                        <div class="mt-1 break-all text-white">{restrictedRoomId}</div>
                    </div>
                {/if}

                <div
                    class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-xs text-white/60"
                >
                    {$LL.chat.roomPanel.settings.readOnly()}
                </div>
            {/if}
        </div>
    </div>

    {#if hasAnyEditableField}
        <div
            class="sticky bottom-0 z-10 shrink-0 border border-solid border-x-0 border-b-0 border-white/10 bg-black/80 px-3 py-3 backdrop-blur"
        >
            {#if saveError}
                <div
                    class="mb-3 rounded-lg border border-solid border-danger-900/40 bg-danger-900/20 px-3 py-3 text-xs text-white"
                >
                    {saveError}
                </div>
            {/if}
            <button
                type="button"
                class="btn btn-secondary m-0 w-full justify-center disabled:opacity-50"
                data-testid="roomSettingsSaveButton"
                disabled={settingsSaving || (!settingsDirty && !permissionsDirty) || editableName.trim().length === 0}
                onclick={saveSettings}
            >
                {settingsSaving ? $LL.chat.roomPanel.settings.saving() : $LL.chat.roomPanel.settings.save()}
            </button>
        </div>
    {/if}
</div>
