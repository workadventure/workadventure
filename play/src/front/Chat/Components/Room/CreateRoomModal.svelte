<script lang="ts">
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import type { CreateRoomOptions, historyVisibility } from "../../Connection/ChatConnection";
    import { historyVisibilityOptions } from "../../Connection/ChatConnection";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import LL from "../../../../i18n/i18n-svelte";
    import { IconAlertTriangle, IconHelpCircle, IconInfoCircle } from "../../../Components/Icons";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import SelectMatrixUser from "../SelectMatrixUser.svelte";
    import Input from "../../../Components/Input/Input.svelte";
    import InputCheckbox from "../../../Components/Input/InputCheckbox.svelte";
    import InputRadio from "../../../Components/Input/InputRadio.svelte";
    import Spinner from "../../../Components/Icons/Spinner.svelte";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        parentID?: string;
    }

    let { isOpen, parentID }: Props = $props();
    let createRoomOptions: CreateRoomOptions = $state(
        (() => {
            const options: CreateRoomOptions = {
                visibility: "private",
                historyVisibility: historyVisibilityOptions[0], // Default to "joined"
            };
            if (parentID) {
                options.parentSpaceID = parentID;
                options.visibility = "restricted"; // Set to folder members only
            }
            return options;
        })(),
    );
    let createRoomError: string | undefined = $state(undefined);

    const chat = gameManager.chatConnection;

    let loadingRoomCreation = $state(false);

    async function createNewRoom(createRoomOptions: CreateRoomOptions) {
        try {
            createRoomError = undefined;
            loadingRoomCreation = true;
            await chat.createRoom(createRoomOptions);
            modals.close();
            notifyUserForRoomCreation();
        } catch (error) {
            console.error(error);
            if (error instanceof Error) {
                createRoomError = error.message;
            } else {
                createRoomError = get(LL).chat.unknownError();
            }
        } finally {
            loadingRoomCreation = false;
        }
    }

    function notifyUserForRoomCreation() {
        notificationPlayingStore.playNotification($LL.chat.createRoom.creationSuccessNotification());
    }

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

    function focusChatInput() {
        // Disable input manager to prevent the game from receiving the input
        chatInputFocusStore.set(true);
    }
    function unfocusChatInput() {
        // Enable input manager to allow the game to receive the input
        chatInputFocusStore.set(false);
    }

    function handleSelectMatrixUserError(error: string) {
        createRoomError = error;
    }
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1>
            {#if parentID}
                {$LL.chat.createRoom.title()}
            {:else}
                {$LL.chat.createRoom.rootTitle()}
            {/if}
        </h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col gap-5">
            {#if parentID}
                <span class="p-3 flex flex-row items-center gap-2 bg-white/10 rounded mt-3">
                    <IconInfoCircle />
                    {$LL.chat.createRoom.restrictedDescription({ folderName: get(chat.getRoomByID(parentID).name) })}
                </span>
            {/if}
            {#if loadingRoomCreation}
                <div class="w-full flex items-center justify-center p-2">
                    <Spinner />
                </div>
            {:else}
                {#if createRoomError !== undefined}
                    <div class="bg-red-500 p-2 rounded">
                        {$LL.chat.createRoom.error()} : <b><i>{createRoomError}</i></b>
                    </div>
                {/if}
                <div class="flex flex-col items-start gap-1">
                    <Input
                        data-testid="createRoomName"
                        label={$LL.chat.createRoom.name()}
                        placeholder={$LL.chat.createRoom.name()}
                        bind:value={createRoomOptions.name}
                        onfocusin={focusChatInput}
                        onfocusout={unfocusChatInput}
                    />

                    {#if parentID}
                        <div>
                            <div class="pl-1">
                                <input
                                    data-testid="createRoomSuggested"
                                    bind:checked={createRoomOptions.suggested}
                                    type="checkbox"
                                    id="suggestedData"
                                    onfocusin={focusChatInput}
                                    onfocusout={unfocusChatInput}
                                />
                                <label class="m-0" for="suggestedData">{$LL.chat.createRoom.suggested()}</label>
                            </div>
                            <span class="text-xs m-0 p-0 text-gray-400 pl-1 flex flex-row items-center gap-1">
                                <IconHelpCircle font-size={18} />
                                {$LL.chat.createRoom.suggestedDescription()}
                            </span>
                        </div>
                    {/if}
                    {#if createRoomOptions.visibility === "private"}
                        <div class="flex flex-row items-center gap-0">
                            <div class="pl-1">
                                <InputCheckbox
                                    data-testid="createRoomEncryption"
                                    label={$LL.chat.createRoom.e2eEncryption.label()}
                                    bind:value={createRoomOptions.encrypt}
                                    id="encryptData"
                                    onfocusin={focusChatInput}
                                    onfocusout={unfocusChatInput}
                                />
                            </div>
                            <p class="text-xs m-0 p-0 text-gray-400 flex items-center">
                                <IconAlertTriangle class="mr-2" font-size={16} />
                                {$LL.chat.createRoom.e2eEncryption.description()}
                            </p>
                        </div>
                    {/if}
                </div>
                {#if !parentID}
                    <div class="flex flex-col items-start gap-1">
                        <div class="input-label">
                            <span>{$LL.chat.createRoom.users()}</span>
                        </div>
                        <SelectMatrixUser
                            onerror={handleSelectMatrixUserError}
                            bind:value={createRoomOptions.invite}
                            placeholder={$LL.chat.createRoom.users()}
                        />
                    </div>
                {/if}
                <div>
                    <p class="p-0 m-0 pl-1 py-2 font-bold">{$LL.chat.createRoom.historyVisibility.label()}</p>
                    {#each historyVisibilityOptions as historyVisibilityOption (historyVisibilityOption)}
                        <label class="m-0" for="historyVisibility-{historyVisibilityOption}">
                            <InputRadio
                                id={`historyVisibility-${historyVisibilityOption}`}
                                bind:group={createRoomOptions.historyVisibility}
                                value={historyVisibilityOption}
                                onfocusin={focusChatInput}
                                onfocusout={unfocusChatInput}
                                label={getHistoryTranslation(historyVisibilityOption)}
                            />
                        </label>
                    {/each}
                </div>
            {/if}
        </div>
    {/snippet}

    {#snippet action()}
        {#if loadingRoomCreation}
            <p>{$LL.chat.createRoom.loadingCreation()}</p>
        {:else}
            <button class="flex-1 justify-cente btn btn-contrast m-1" onclick={() => modals.close()}
                >{$LL.chat.createRoom.buttons.cancel()}</button
            >
            <button
                data-testid="createRoomButton"
                class="disabled:text-gray-400 btn btn-secondary disabled:bg-gray-500 bg-secondary flex-1 justify-center m-1"
                disabled={createRoomOptions.name === undefined || createRoomOptions.name?.trim().length === 0}
                onclick={() => createNewRoom(createRoomOptions)}
                >{$LL.chat.createRoom.buttons.create()}
            </button>
        {/if}
    {/snippet}
</Popup>
