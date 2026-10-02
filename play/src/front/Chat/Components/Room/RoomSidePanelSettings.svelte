<script lang="ts">
    import { EventType } from "matrix-js-sdk";
    import { readable } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import Button from "../../../Components/UI/Button.svelte";
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
    import {
        ChatPermissionLevel,
        ChatRoomSettingsError,
        historyVisibilityOptions,
    } from "../../Connection/ChatConnection";

    interface Props {
        room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration & ChatRoomSettingsManagement;
    }

    let { room }: Props = $props();

    const emptyPrivacyState = readable<ChatRoomPrivacyState>({});
    const permissionRows: { key: keyof ChatRoomPermissionsState }[] = [
        { key: "sendMessages" },
        { key: "sendReactions" },
        { key: "redactOwnMessages" },
        { key: "redactOtherMessages" },
        { key: "kickUsers" },
        { key: "banUsers" },
        { key: "inviteUsers" },
        { key: "changeSettings" },
        { key: "changeRoomName" },
        { key: "changeRoomTopic" },
        { key: "changeHistoryVisibility" },
        { key: "changeAccess" },
        { key: "changePermissions" },
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

    // The access/history <select>s can only represent a subset of the possible Matrix values, so we
    // collapse the current room state down to the closest representable option (e.g. a "public" or
    // "knock" join rule shows as "invite", a "shared" history visibility shows as "joined").
    // saveSettings() reuses these helpers to detect whether the user actually changed the control, so
    // that editing an unrelated field never rewrites join_rules / history_visibility with the lossy
    // collapsed value.
    function currentAccessValue(): ChatRoomSettingsAccess {
        return $privacyState.joinRule === "restricted" ? "restricted" : "invite";
    }
    function currentHistoryValue(): historyVisibility {
        return historyVisibilityOptions.includes($privacyState.historyVisibility as historyVisibility)
            ? ($privacyState.historyVisibility as historyVisibility)
            : "joined";
    }

    $effect.pre(() => {
        if (settingsDirty) {
            return;
        }
        editableName = $roomName;
        editableTopic = $roomTopic;
        editableAccess = currentAccessValue();
        editableHistoryVisibility = currentHistoryValue();
    });

    $effect.pre(() => {
        if (permissionsDirty) {
            return;
        }
        editablePermissions = { ...$roomPermissions };
    });

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

    function getSaveErrorMessage(error: unknown) {
        if (error instanceof ChatRoomSettingsError) {
            switch (error.code) {
                case "roomNameEmpty":
                    return $LL.chat.roomPanel.settings.errors.roomNameEmpty();
                case "restrictedAccessNeedsParentSpace":
                    return $LL.chat.roomPanel.settings.errors.restrictedAccessNeedsParentSpace();
            }
        }
        return $LL.chat.roomPanel.settings.saveError();
    }

    async function saveSettings() {
        // Only forward a field when the user actually changed it. Comparing against the collapsed
        // current value (currentAccessValue / currentHistoryValue) is what prevents an edit to an
        // unrelated field (e.g. the name) from silently rewriting join_rules / history_visibility to
        // their lossy representable value — e.g. a "public" room being reset to "invite", or a
        // "shared" history being reset to "joined".
        const nameChanged = $canEditName && editableName !== $roomName;
        const topicChanged = $canEditTopic && editableTopic !== $roomTopic;
        const accessChanged = $canEditAccess && editableAccess !== currentAccessValue();
        const historyChanged = $canEditHistory && editableHistoryVisibility !== currentHistoryValue();

        const shouldSaveSettings = settingsDirty && (nameChanged || topicChanged || accessChanged || historyChanged);
        const shouldSavePermissions = permissionsDirty && $canEditPermissions;

        if (!shouldSaveSettings && !shouldSavePermissions) {
            saveError = $LL.chat.roomPanel.settings.saveError();
            return;
        }

        try {
            saveError = undefined;
            settingsSaving = true;
            if (shouldSaveSettings) {
                await room.updateRoomSettings({
                    name: nameChanged ? editableName : undefined,
                    topic: topicChanged ? editableTopic : undefined,
                    access: accessChanged ? editableAccess : undefined,
                    restrictedRoomId,
                    historyVisibility: historyChanged ? editableHistoryVisibility : undefined,
                });
            }
            if (shouldSavePermissions) {
                await room.updateRoomPowerLevels(editablePermissions);
            }
            clearDirtyFlagsAfterSave(shouldSaveSettings, shouldSavePermissions);
            notificationPlayingStore.playNotification($LL.chat.roomPanel.settings.saveSuccess());
        } catch (error) {
            console.error("Failed to save Matrix room settings", error);
            saveError = getSaveErrorMessage(error);
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
                        <option value="joined">{$LL.chat.createRoom.historyVisibility.joined()}</option>
                        <option value="invited">{$LL.chat.createRoom.historyVisibility.invited()}</option>
                        <option value="world_readable">
                            {$LL.chat.createRoom.historyVisibility.world_readable()}
                        </option>
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
                                <span class="min-w-0 flex-1">
                                    {#if permissionRow.key === "sendMessages"}
                                        {$LL.chat.roomPanel.settings.permissions.sendMessages()}
                                    {:else if permissionRow.key === "sendReactions"}
                                        {$LL.chat.roomPanel.settings.permissions.sendReactions()}
                                    {:else if permissionRow.key === "redactOwnMessages"}
                                        {$LL.chat.roomPanel.settings.permissions.redactOwnMessages()}
                                    {:else if permissionRow.key === "redactOtherMessages"}
                                        {$LL.chat.roomPanel.settings.permissions.redactOtherMessages()}
                                    {:else if permissionRow.key === "kickUsers"}
                                        {$LL.chat.roomPanel.settings.permissions.kickUsers()}
                                    {:else if permissionRow.key === "banUsers"}
                                        {$LL.chat.roomPanel.settings.permissions.banUsers()}
                                    {:else if permissionRow.key === "inviteUsers"}
                                        {$LL.chat.roomPanel.settings.permissions.inviteUsers()}
                                    {:else if permissionRow.key === "changeSettings"}
                                        {$LL.chat.roomPanel.settings.permissions.changeSettings()}
                                    {:else if permissionRow.key === "changeRoomName"}
                                        {$LL.chat.roomPanel.settings.permissions.changeRoomName()}
                                    {:else if permissionRow.key === "changeRoomTopic"}
                                        {$LL.chat.roomPanel.settings.permissions.changeRoomTopic()}
                                    {:else if permissionRow.key === "changeHistoryVisibility"}
                                        {$LL.chat.roomPanel.settings.permissions.changeHistoryVisibility()}
                                    {:else if permissionRow.key === "changeAccess"}
                                        {$LL.chat.roomPanel.settings.permissions.changeAccess()}
                                    {:else if permissionRow.key === "changePermissions"}
                                        {$LL.chat.roomPanel.settings.permissions.changePermissions()}
                                    {/if}
                                </span>
                                <select
                                    class="w-36 rounded border border-solid border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white disabled:opacity-60"
                                    data-testid={`roomPermission-${permissionRow.key}`}
                                    bind:value={editablePermissions[permissionRow.key]}
                                    disabled={!$canEditPermissions || settingsSaving}
                                    onchange={markPermissionsDirty}
                                >
                                    <option value={ChatPermissionLevel.USER}>
                                        {$LL.chat.manageRoomUsers.roles.USER()}
                                    </option>
                                    <option value={ChatPermissionLevel.MODERATOR}>
                                        {$LL.chat.manageRoomUsers.roles.MODERATOR()}
                                    </option>
                                    <option value={ChatPermissionLevel.ADMIN}>
                                        {$LL.chat.manageRoomUsers.roles.ADMIN()}
                                    </option>
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
                    <div class="mt-1 text-white">
                        {#if $privacyState.joinRule === "public"}
                            {$LL.chat.roomPanel.settings.joinRules.public()}
                        {:else if $privacyState.joinRule === "invite"}
                            {$LL.chat.roomPanel.settings.joinRules.invite()}
                        {:else if $privacyState.joinRule === "restricted"}
                            {$LL.chat.roomPanel.settings.joinRules.restricted()}
                        {:else if $privacyState.joinRule === "knock"}
                            {$LL.chat.roomPanel.settings.joinRules.knock()}
                        {:else}
                            {$privacyState.joinRule ?? $LL.chat.roomPanel.settings.unknown()}
                        {/if}
                    </div>
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
            <Button
                variant="secondary"
                class="m-0 w-full disabled:opacity-50"
                dataTestId="roomSettingsSaveButton"
                disabled={settingsSaving ||
                    (!settingsDirty && !permissionsDirty) ||
                    ($canEditName && editableName.trim().length === 0)}
                onclick={saveSettings}
            >
                {settingsSaving ? $LL.chat.roomPanel.settings.saving() : $LL.chat.roomPanel.settings.save()}
            </Button>
        </div>
    {/if}
</div>
