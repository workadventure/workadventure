<script lang="ts">
    import { EventType } from "matrix-js-sdk/lib/@types/event";
    import { readable } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import Button from "../../../Components/UI/Button.svelte";
    import Alert from "../../../Components/UI/Alert.svelte";
    import Input from "../../../Components/Input/Input.svelte";
    import Select from "../../../Components/Input/Select.svelte";
    import InputCheckbox from "../../../Components/Input/InputCheckbox.svelte";
    import InputRadio from "../../../Components/Input/InputRadio.svelte";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import Avatar from "../Avatar.svelte";
    import type {
        ChatRoom,
        ChatRoomMembershipManagement,
        ChatRoomModeration,
        ChatRoomPermissionsState,
        ChatRoomPrivacyState,
        ChatRoomFolderPlacement,
        ChatRoomJoinRule,
        ChatRoomSettingsManagement,
        historyVisibility,
    } from "../../Connection/ChatConnection";
    import {
        ChatPermissionLevel,
        ChatRoomSettingsError,
        historyVisibilityOptions,
    } from "../../Connection/ChatConnection";
    import { applyWritePreset, permissionsLostBy, writePresetOf, type WritePreset } from "./roomPermissionPresets";
    import { IconCopy } from "@wa-icons";

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
    // Public and on-request rooms keep their real value here: they show it, even if only "invite" and
    // "restricted" can be picked.
    let editableAccess: ChatRoomJoinRule = $state("invite");
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
    // Read again when the room's folder changes.
    let folderPlacement: ChatRoomFolderPlacement | undefined = $derived(
        $privacyState.restrictedRoomId !== undefined ? room.getFolderPlacement() : undefined,
    );
    let canEditAvatar = $derived(room.hasPermissionForRoomStateEvent(EventType.RoomAvatar));
    let hasAnyEditableField = $derived(
        $canEditName ||
            $canEditTopic ||
            $canEditAccess ||
            $canEditHistory ||
            $canEditPermissions ||
            $canEditAvatar ||
            folderPlacement?.canChangeSuggested === true,
    );

    // The access/history <select>s can only represent a subset of the possible Matrix values, so we
    // collapse the current room state down to the closest representable option (e.g. a "public" or
    // "knock" join rule shows as "invite", a "shared" history visibility shows as "joined").
    // saveSettings() reuses these helpers to detect whether the user actually changed the control, so
    // that editing an unrelated field never rewrites join_rules / history_visibility with the lossy
    // collapsed value.
    function currentAccessValue(): ChatRoomJoinRule {
        const joinRule = $privacyState.joinRule;
        return joinRule === "restricted" || joinRule === "public" || joinRule === "knock" ? joinRule : "invite";
    }
    function currentHistoryValue(): historyVisibility {
        return historyVisibilityOptions.includes($privacyState.historyVisibility as historyVisibility)
            ? ($privacyState.historyVisibility as historyVisibility)
            : "joined";
    }

    let editableSuggested = $state(false);
    let avatarFile: File | undefined = $state();
    let avatarPreview: string | undefined = $state();
    let myPermissionLevel = $derived(room.myPermissionLevel);
    let writePreset: WritePreset = $state("everyone");
    let detailsOpen = $state(false);
    let lostPermissions = $derived(
        permissionsDirty ? permissionsLostBy($myPermissionLevel, $roomPermissions, editablePermissions) : [],
    );

    $effect.pre(() => {
        if (settingsDirty) {
            return;
        }
        editableSuggested = folderPlacement?.suggested ?? false;
        editableName = $roomName;
        editableTopic = $roomTopic;
        editableAccess = currentAccessValue();
        editableHistoryVisibility = currentHistoryValue();
    });

    $effect.pre(() => {
        if (permissionsDirty) {
            return;
        }
        const current = { ...$roomPermissions };
        editablePermissions = current;
        writePreset = writePresetOf(current);
    });

    $effect(() => {
        const url = avatarPreview;
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    });

    let roomIdCopied = $state(false);
    function copyRoomId() {
        navigator.clipboard
            .writeText(room.id)
            .then(() => {
                roomIdCopied = true;
                setTimeout(() => (roomIdCopied = false), 2000);
            })
            .catch((error) => console.error(error));
    }

    function pickAvatar(event: Event) {
        const file = (event.currentTarget as HTMLInputElement).files?.[0];
        if (!file) return;
        avatarFile = file;
        avatarPreview = URL.createObjectURL(file);
        markSettingsDirty();
    }

    function pickWritePreset() {
        if (writePreset === "custom") {
            detailsOpen = true;
            return;
        }
        editablePermissions = applyWritePreset(editablePermissions, writePreset);
        markPermissionsDirty();
    }

    function forgetPickedAvatar() {
        avatarFile = undefined;
        avatarPreview = undefined;
    }

    function cancel() {
        settingsDirty = false;
        permissionsDirty = false;
        forgetPickedAvatar();
        saveError = undefined;
    }

    // Keys typed in the fields must not move the Woka.
    const focusChatInput = () => chatInputFocusStore.set(true);
    const unfocusChatInput = () => chatInputFocusStore.set(false);

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
        const accessChanged =
            $canEditAccess &&
            editableAccess !== currentAccessValue() &&
            (editableAccess === "invite" || editableAccess === "restricted");
        const suggestedChanged =
            folderPlacement?.canChangeSuggested === true && editableSuggested !== folderPlacement.suggested;
        const avatarChanged = $canEditAvatar && avatarFile !== undefined;
        const historyChanged = $canEditHistory && editableHistoryVisibility !== currentHistoryValue();

        const shouldSaveSettings =
            settingsDirty &&
            (nameChanged || topicChanged || accessChanged || historyChanged || suggestedChanged || avatarChanged);
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
                    access: accessChanged ? (editableAccess as "invite" | "restricted") : undefined,
                    restrictedRoomId,
                    historyVisibility: historyChanged ? editableHistoryVisibility : undefined,
                    suggested: suggestedChanged ? editableSuggested : undefined,
                    avatar: avatarChanged ? avatarFile : undefined,
                });
            }
            if (shouldSavePermissions) {
                await room.updateRoomPowerLevels(editablePermissions);
            }
            clearDirtyFlagsAfterSave(shouldSaveSettings, shouldSavePermissions);
            if (avatarChanged) forgetPickedAvatar();
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
        <div class="flex flex-col gap-3 text-sm">
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

            <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                <div class="text-xs font-semibold uppercase text-white/45">
                    {$LL.chat.roomPanel.settings.roomId()}
                </div>
                <div class="mt-1 flex items-center gap-2">
                    <span class="min-w-0 flex-1 break-all text-xs text-white" data-testid="roomID">{room.id}</span>
                    <Button
                        variant="light"
                        appearance="border"
                        size="xs"
                        class="m-0 shrink-0"
                        dataTestId="copyRoomIdButton"
                        onclick={copyRoomId}
                    >
                        {#snippet icon()}
                            <IconCopy font-size={14} aria-hidden="true" />
                        {/snippet}
                        {roomIdCopied ? $LL.chat.copied() : $LL.chat.copy()}
                    </Button>
                </div>
            </div>

            {#if hasAnyEditableField}
                <div class="flex items-center gap-3 rounded-lg border border-solid border-white/10 bg-white/[0.04] p-3">
                    {#if avatarPreview}
                        <img src={avatarPreview} alt="" class="h-10 w-10 shrink-0 rounded-sm object-cover" />
                    {:else}
                        <Avatar pictureStore={room.pictureStore} fallbackName={$roomName} />
                    {/if}
                    {#if $canEditAvatar}
                        <label
                            class="btn btn-sm btn-ghost m-0 cursor-pointer focus-within:ring-2 focus-within:ring-white/60"
                            data-testid="roomSettingsAvatarButton"
                        >
                            {$LL.chat.roomPanel.settings.changeAvatar()}
                            <input
                                type="file"
                                accept="image/*"
                                class="sr-only"
                                data-testid="roomSettingsAvatarInput"
                                disabled={settingsSaving}
                                onchange={pickAvatar}
                            />
                        </label>
                    {/if}
                </div>

                <Input
                    data-testid="roomSettingsNameInput"
                    label={$LL.chat.createRoom.name()}
                    bind:value={editableName}
                    disabled={!$canEditName || settingsSaving}
                    oninput={markSettingsDirty}
                    onfocusin={focusChatInput}
                    onfocusout={unfocusChatInput}
                />

                <Input
                    data-testid="roomSettingsTopicInput"
                    label={$LL.chat.roomPanel.settings.topic()}
                    bind:value={editableTopic}
                    disabled={!$canEditTopic || settingsSaving}
                    oninput={markSettingsDirty}
                    onfocusin={focusChatInput}
                    onfocusout={unfocusChatInput}
                />

                <Select
                    dataTestId="roomSettingsAccessSelect"
                    label={$LL.chat.roomPanel.settings.whoCanJoin()}
                    bind:value={editableAccess}
                    disabled={!$canEditAccess || settingsSaving}
                    onchange={markSettingsDirty}
                >
                    {#if editableAccess === "public"}
                        <option value="public" disabled>{$LL.chat.roomPanel.settings.joinRules.public()}</option>
                    {:else if editableAccess === "knock"}
                        <option value="knock" disabled>{$LL.chat.roomPanel.settings.joinRules.knock()}</option>
                    {/if}
                    <option value="invite">{$LL.chat.roomPanel.settings.joinRules.invite()}</option>
                    <option value="restricted" disabled={!canUseRestrictedAccess}>
                        {folderPlacement
                            ? $LL.chat.roomPanel.settings.joinFolderMembers({ folder: folderPlacement.folderName })
                            : $LL.chat.roomPanel.settings.joinRules.restricted()}
                    </option>
                </Select>
                {#if !canUseRestrictedAccess}
                    <div class="-mt-1 text-xs text-white/45">
                        {$LL.chat.roomPanel.settings.restrictedUnavailable()}
                    </div>
                {/if}

                {#if folderPlacement}
                    <InputCheckbox
                        data-testid="roomSettingsSuggested"
                        label={$LL.chat.roomPanel.settings.suggestedIn({ folder: folderPlacement.folderName })}
                        bind:value={editableSuggested}
                        disabled={!folderPlacement.canChangeSuggested || settingsSaving}
                        onchange={markSettingsDirty}
                    />
                {/if}

                <Select
                    dataTestId="roomSettingsHistoryVisibilitySelect"
                    label={$LL.chat.createRoom.historyVisibility.label()}
                    bind:value={editableHistoryVisibility}
                    disabled={!$canEditHistory || settingsSaving}
                    onchange={markSettingsDirty}
                >
                    <option value="joined">{$LL.chat.createRoom.historyVisibility.joined()}</option>
                    <option value="invited">{$LL.chat.createRoom.historyVisibility.invited()}</option>
                    <option value="world_readable">
                        {$LL.chat.createRoom.historyVisibility.world_readable()}
                    </option>
                </Select>

                <fieldset class="m-0 flex flex-col border-0 p-0">
                    <legend class="p-0 pb-1 text-sm font-bold">{$LL.chat.roomPanel.settings.whoCanWrite()}</legend>
                    {#each ["everyone", "moderators", "custom"] as const as preset (preset)}
                        <InputRadio
                            id={`roomSettingsWritePreset-${preset}`}
                            name="roomSettingsWritePreset"
                            bind:group={writePreset}
                            value={preset}
                            disabled={!$canEditPermissions || settingsSaving}
                            onchange={pickWritePreset}
                            label={preset === "everyone"
                                ? $LL.chat.roomPanel.settings.writePresets.everyone()
                                : preset === "moderators"
                                  ? $LL.chat.roomPanel.settings.writePresets.moderators()
                                  : $LL.chat.roomPanel.settings.writePresets.custom()}
                        />
                    {/each}
                </fieldset>

                <details
                    class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3"
                    bind:open={detailsOpen}
                >
                    <summary class="cursor-pointer py-3 font-bold" data-testid="roomSettingsDetailedPermissions">
                        {$LL.chat.roomPanel.settings.permissions.detailed()}
                    </summary>
                    <div class="flex flex-col gap-2 pb-3">
                        {#each permissionRows as permissionRow (permissionRow.key)}
                            <Select
                                dataTestId={`roomPermission-${permissionRow.key}`}
                                label={$LL.chat.roomPanel.settings.permissions[permissionRow.key]()}
                                bind:value={editablePermissions[permissionRow.key]}
                                disabled={!$canEditPermissions || settingsSaving}
                                onchange={() => {
                                    writePreset = writePresetOf(editablePermissions);
                                    markPermissionsDirty();
                                }}
                            >
                                <option value={ChatPermissionLevel.USER}>{$LL.chat.manageRoomUsers.roles.USER()}</option
                                >
                                <option value={ChatPermissionLevel.MODERATOR}>
                                    {$LL.chat.manageRoomUsers.roles.MODERATOR()}
                                </option>
                                <option value={ChatPermissionLevel.ADMIN}
                                    >{$LL.chat.manageRoomUsers.roles.ADMIN()}</option
                                >
                            </Select>
                        {/each}
                    </div>
                </details>
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
                            {folderPlacement
                                ? $LL.chat.roomPanel.settings.joinFolderMembers({ folder: folderPlacement.folderName })
                                : $LL.chat.roomPanel.settings.joinRules.restricted()}
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
            {#if lostPermissions.length > 0}
                <div class="mb-3" data-testid="roomSettingsLostRightsWarning">
                    <Alert variant="warning" class="w-full">{$LL.chat.roomPanel.settings.lostRightsWarning()}</Alert>
                </div>
            {/if}
            <div class="flex gap-2">
                <Button
                    variant="contrast"
                    class="m-0 flex-1"
                    dataTestId="roomSettingsCancelButton"
                    disabled={settingsSaving || (!settingsDirty && !permissionsDirty)}
                    onclick={cancel}
                >
                    {$LL.chat.confirm.cancel()}
                </Button>
                <Button
                    variant="secondary"
                    class="m-0 flex-1 disabled:opacity-50"
                    dataTestId="roomSettingsSaveButton"
                    disabled={settingsSaving ||
                        (!settingsDirty && !permissionsDirty) ||
                        ($canEditName && editableName.trim().length === 0)}
                    onclick={saveSettings}
                >
                    {settingsSaving ? $LL.chat.roomPanel.settings.saving() : $LL.chat.roomPanel.settings.save()}
                </Button>
            </div>
        </div>
    {/if}
</div>
