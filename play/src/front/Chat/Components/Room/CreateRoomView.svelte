<script lang="ts">
    import { get } from "svelte/store";
    import type { CreateRoomOptions, historyVisibility } from "../../Connection/ChatConnection";
    import { historyVisibilityOptions } from "../../Connection/ChatConnection";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import SelectMatrixUser from "../SelectMatrixUser.svelte";
    import Input from "../../../Components/Input/Input.svelte";
    import TextArea from "../../../Components/Input/TextArea.svelte";
    import InputCheckbox from "../../../Components/Input/InputCheckbox.svelte";
    import InputGroupLabel from "../../../Components/Input/InputGroupLabel.svelte";
    import InputRadio from "../../../Components/Input/InputRadio.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import Alert from "../../../Components/UI/Alert.svelte";
    import { navChat } from "../../Stores/ChatStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { creationErrorMessage } from "./creationErrorMessage";
    import { IconChevronLeft, IconLoader } from "@wa-icons";

    interface Props {
        kind: "room" | "folder";
        parentID?: string;
        parentName?: string;
    }

    let { kind, parentID, parentName = "" }: Props = $props();

    // The same fields wherever the view is opened from: only "who can join" depends on having a parent folder.
    let options: CreateRoomOptions = $state(
        (() => ({
            name: "",
            description: "",
            visibility: parentID ? "restricted" : "private",
            parentSpaceID: parentID,
            historyVisibility: historyVisibilityOptions[0],
            invite: [],
        }))(),
    );
    let error: string | undefined = $state(undefined);
    let creating = $state(false);

    const chat = gameManager.chatConnection;

    let canSubmit = $derived((options.name ?? "").trim().length > 0 && !creating);
    // A folder open to the members of its parent has nobody to invite.
    let showInvite = $derived(kind === "room" || options.visibility === "private");
    let heading = $derived(
        kind === "room"
            ? parentID
                ? $LL.chat.createView.titleRoomIn({ folder: parentName })
                : $LL.chat.createView.titleRoom()
            : parentID
              ? $LL.chat.createView.titleFolderIn({ folder: parentName })
              : $LL.chat.createView.titleFolder(),
    );

    function back() {
        navChat.switchToChat();
    }

    async function create() {
        if (!canSubmit) return;
        error = undefined;
        creating = true;
        const payload: CreateRoomOptions = {
            ...options,
            name: options.name?.trim(),
            description: options.description?.trim() || undefined,
            invite: showInvite ? options.invite : [],
        };
        try {
            if (kind === "room") {
                const { room } = await chat.createRoom(payload);
                notificationPlayingStore.playNotification($LL.chat.createRoom.creationSuccessNotification());
                navChat.switchToChat();
                // Open the new room right away instead of leaving the user to find it (maybe in a closed folder).
                if (room) selectedRoomStore.set(room);
            } else {
                await chat.createFolder(payload);
                analyticsClient.trackAdminEvent("chat.matrix_folder.created");
                notificationPlayingStore.playNotification($LL.chat.createFolder.creationSuccessNotification());
                navChat.switchToChat();
            }
        } catch (e) {
            console.error(e);
            const errors = kind === "room" ? get(LL).chat.createRoom.errors : get(LL).chat.createFolder.errors;
            error = creationErrorMessage(e, {
                forbidden: kind === "room" ? get(LL).chat.createRoom.errors.forbidden() : errors.generic(),
                rateLimited: get(LL).chat.createRoom.errors.rateLimited(),
                generic: errors.generic(),
                addToFolder: get(LL).chat.addRoomToFolderError(),
            });
        } finally {
            creating = false;
        }
    }

    function getHistoryTranslation(option: historyVisibility) {
        switch (option) {
            case "world_readable":
                return $LL.chat.createRoom.historyVisibility.world_readable();
            case "invited":
                return $LL.chat.createRoom.historyVisibility.invited();
            case "joined":
                return $LL.chat.createRoom.historyVisibility.joined();
        }
    }

    // Enter in the name creates, like before; not in the invite field, where it picks a person.
    function submitOnEnter(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            create().catch((e) => console.error(e));
        }
    }

    // Keys typed here must not move the Woka.
    const focusChatInput = () => chatInputFocusStore.set(true);
    const unfocusChatInput = () => chatInputFocusStore.set(false);
</script>

<!-- Escape only goes back while the focus is inside the view, so it never fights the game or a modal. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="flex h-full min-h-0 flex-col text-white"
    data-testid="createRoomView"
    onkeydown={(event) => {
        if (event.key === "Escape") back();
    }}
>
    <div class="flex items-center gap-2 border border-solid border-x-0 border-t-0 border-white/10 p-2">
        <button
            type="button"
            class="m-0 flex aspect-square h-12 w-12 shrink-0 items-center justify-center rounded hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
            data-testid="createRoomBackButton"
            title={$LL.chat.roomPanel.back()}
            aria-label={$LL.chat.roomPanel.back()}
            onclick={back}
        >
            <IconChevronLeft font-size="20" />
        </button>
        <h2 class="m-0 min-w-0 flex-1 truncate text-base font-bold">{heading}</h2>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 text-sm">
        {#if error !== undefined}
            <Alert variant="danger" class="w-full">{error}</Alert>
        {/if}

        <!-- svelte-ignore a11y_autofocus -->
        <Input
            data-testid={kind === "room" ? "createRoomName" : "createFolderName"}
            label={$LL.chat.createRoom.name()}
            bind:value={options.name}
            onfocusin={focusChatInput}
            onfocusout={unfocusChatInput}
            onkeydown={submitOnEnter}
            autofocus
        />

        <TextArea
            dataTestId="createRoomTopic"
            label={$LL.chat.createView.topic()}
            placeHolder={kind === "room"
                ? $LL.chat.createView.topicRoomPlaceholder()
                : $LL.chat.createView.topicFolderPlaceholder()}
            bind:value={options.description}
            onfocus={focusChatInput}
            onblur={unfocusChatInput}
            height="h-20"
        />

        <fieldset class="m-0 flex flex-col gap-0 border-0 p-0">
            <legend class="p-0 pb-1 text-sm font-bold">{$LL.chat.createView.whoCanJoin()}</legend>
            {#if parentID}
                <InputRadio
                    name="createRoomVisibility"
                    bind:group={options.visibility}
                    value="restricted"
                    label={$LL.chat.createView.joinFolderMembers({ folder: parentName })}
                    onfocusin={focusChatInput}
                    onfocusout={unfocusChatInput}
                />
            {/if}
            <InputRadio
                name="createRoomVisibility"
                bind:group={options.visibility}
                value="private"
                label={$LL.chat.createView.joinInvitedOnly()}
                onfocusin={focusChatInput}
                onfocusout={unfocusChatInput}
            />
        </fieldset>

        {#if showInvite}
            <div class="flex flex-col items-start gap-1">
                <InputGroupLabel id="createRoomInviteLabel">
                    <span>{$LL.chat.createView.invite()}</span>
                </InputGroupLabel>
                <SelectMatrixUser
                    onerror={(message) => (error = message)}
                    bind:value={options.invite}
                    placeholder={$LL.chat.createView.invitePlaceholder()}
                />
            </div>
        {/if}

        {#if kind === "room" || parentID}
            <details class="rounded border border-solid border-white/10 px-2">
                <summary class="cursor-pointer py-2 font-bold" data-testid="createRoomMoreOptions">
                    {$LL.chat.createView.moreOptions()}
                </summary>
                <div class="flex flex-col gap-2 pb-2">
                    {#if kind === "room"}
                        <div>
                            <InputCheckbox
                                data-testid="createRoomEncryption"
                                label={$LL.chat.createRoom.e2eEncryption.label()}
                                bind:value={options.encrypt}
                                onfocusin={focusChatInput}
                                onfocusout={unfocusChatInput}
                            />
                            <p class="m-0 ps-1 text-xs text-white/60">
                                {$LL.chat.createRoom.e2eEncryption.description()}
                            </p>
                        </div>
                    {/if}
                    {#if parentID}
                        <div>
                            <InputCheckbox
                                data-testid="createRoomSuggested"
                                label={$LL.chat.createRoom.suggested()}
                                bind:value={options.suggested}
                                onfocusin={focusChatInput}
                                onfocusout={unfocusChatInput}
                            />
                            <p class="m-0 ps-1 text-xs text-white/60">{$LL.chat.createRoom.suggestedDescription()}</p>
                        </div>
                    {/if}
                    {#if kind === "room"}
                        <fieldset class="m-0 flex flex-col border-0 p-0">
                            <legend class="p-0 pb-1 font-bold">{$LL.chat.createRoom.historyVisibility.label()}</legend>
                            {#each historyVisibilityOptions as option (option)}
                                <InputRadio
                                    id={`historyVisibility-${option}`}
                                    name="createRoomHistoryVisibility"
                                    bind:group={options.historyVisibility}
                                    value={option}
                                    label={getHistoryTranslation(option)}
                                    onfocusin={focusChatInput}
                                    onfocusout={unfocusChatInput}
                                />
                            {/each}
                        </fieldset>
                    {/if}
                </div>
            </details>
        {/if}

        <Button
            variant="secondary"
            class="w-full"
            dataTestId={kind === "room" ? "createRoomButton" : "createFolderButton"}
            disabled={!canSubmit}
            onclick={() => {
                create().catch((e) => console.error(e));
            }}
        >
            {#if creating}
                <IconLoader class="animate-spin" font-size="16" />
            {/if}
            {kind === "room" ? $LL.chat.createView.createRoom() : $LL.chat.createView.createFolder()}
        </Button>
    </div>
</div>
