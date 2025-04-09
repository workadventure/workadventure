<script lang="ts">
    import { closeModal } from "svelte-modals";
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import { CreateRoomOptions, historyVisibility, historyVisibilityOptions } from "../../Connection/ChatConnection";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import LL from "../../../../i18n/i18n-svelte";
    import { IconAlertTriangle, IconHelpCircle, IconLoader } from "../../../Components/Icons";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import SelectMatrixUser from "../SelectMatrixUser.svelte";
    import Input from "../../../Components/Input/Input.svelte";
    import Select from "../../../Components/Input/Select.svelte";
    import InputCheckbox from "../../../Components/Input/InputCheckbox.svelte";
    import InputRadio from "../../../Components/Input/InputRadio.svelte";

    export let isOpen: boolean;
    export let parentID: string | undefined;
    let createRoomOptions: CreateRoomOptions = { visibility: "public" };
    if (parentID) createRoomOptions.parentSpaceID = parentID;
    let createRoomError: string | undefined = undefined;

    const chat = gameManager.chatConnection;

    let loadingRoomCreation = false;

    async function createNewRoom(createRoomOptions: CreateRoomOptions) {
        try {
            createRoomError = undefined;
            loadingRoomCreation = true;
            await chat.createRoom(createRoomOptions);
            closeModal();
            notifyUserForRoomCreation();
        } catch (error) {
            console.error(error);
            if (error instanceof Error) {
                createRoomError = error.message;
            } else {
                createRoomError = "Unknown error";
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

    function handleSelectMatrixUserError(e: CustomEvent) {
        createRoomError = e.detail.error;
    }
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.chat.createRoom.title()}</h1>
    <div slot="content" class="w-full flex flex-col gap-2">
        {#if loadingRoomCreation}
            <div class="animate-[spin_2s_linear_infinite] self-center">
                <IconLoader font-size="2em" />
            </div>
        {:else}
            {#if createRoomError !== undefined}
                <div class="bg-red-500 p-2 rounded">
                    {$LL.chat.createRoom.error()} : <b><i>{createRoomError}</i></b>
                </div>
            {/if}

            <Input
                data-testid="createRoomName"
                label={$LL.chat.createRoom.name()}
                placeholder={$LL.chat.createRoom.name()}
                bind:value={createRoomOptions.name}
                on:focusin={focusChatInput}
                on:focusout={unfocusChatInput}
            />

            <Select
                data-testid="createRoomVisibility"
                label={$LL.chat.createRoom.visibility.label()}
                bind:value={createRoomOptions.visibility}
            >
                <option value="private">{$LL.chat.createRoom.visibility.private()}</option>
                <option value="public">{$LL.chat.createRoom.visibility.public()}</option>
                {#if parentID}
                    <option value="restricted">{$LL.chat.createRoom.visibility.restricted()}</option>
                {/if}

                <span slot="helper">
                    <p class="text-xs m-0 p-0 text-gray-300 flex items-center mb-1">
                        <IconHelpCircle class="mr-2" font-size={18} />
                        {#if createRoomOptions.visibility === "private"}
                            {$LL.chat.createRoom.visibility.privateDescription()}
                        {:else if createRoomOptions.visibility === "public"}
                            {$LL.chat.createRoom.visibility.publicDescription()}
                        {:else if createRoomOptions.visibility === "restricted"}
                            {$LL.chat.createRoom.visibility.restrictedDescription()}
                        {/if}
                    </p>
                </span>
            </Select>

            {#if parentID}
                <div class="pl-1">
                    <input
                        data-testid="createRoomSuggested"
                        bind:checked={createRoomOptions.suggested}
                        type="checkbox"
                        id="suggestedData"
                        on:focusin={focusChatInput}
                        on:focusout={unfocusChatInput}
                    />
                    <label class="m-0" for="suggestedData">{$LL.chat.createRoom.suggested()}</label>
                </div>
                <p class="text-xs m-0 p-0 text-gray-400 pl-1">
                    <IconHelpCircle font-size={18} />
                    {$LL.chat.createRoom.suggestedDescription()}
                </p>
            {/if}
            {#if createRoomOptions.visibility === "private"}
                <div class="pl-1">
                    <InputCheckbox
                        data-testid="createRoomEncryption"
                        label={$LL.chat.createRoom.e2eEncryption.label()}
                        bind:value={createRoomOptions.encrypt}
                        id="encryptData"
                        on:focusin={focusChatInput}
                        on:focusout={unfocusChatInput}
                    />
                </div>
                <p class="text-xs m-0 p-0 text-gray-400 pl-3 flex items-center ">
                    <IconAlertTriangle class="mr-2" font-size={18} />
                    {$LL.chat.createRoom.e2eEncryption.description()}
                </p>
            {/if}
            <p class="p-0 m-0 pl-1 font-bold">{$LL.chat.createRoom.users()}</p>
            <SelectMatrixUser
                on:error={handleSelectMatrixUserError}
                bind:value={createRoomOptions.invite}
                placeholder={$LL.chat.createRoom.users()}
            />

            <p class="p-0 m-0 pl-1 font-bold">{$LL.chat.createRoom.historyVisibility.label()}</p>
            {#each historyVisibilityOptions as historyVisibilityOption (historyVisibilityOption)}
                <label class="m-0" for="historyVisibility-{historyVisibilityOption}">
                    <InputRadio
                        id={`historyVisibility-${historyVisibilityOption}`}
                        bind:group={createRoomOptions.historyVisibility}
                        value={historyVisibilityOption}
                        on:focusin={focusChatInput}
                        on:focusout={unfocusChatInput}
                        label={getHistoryTranslation(historyVisibilityOption)}
                    />
                </label>
            {/each}
        {/if}
    </div>

    <svelte:fragment slot="action">
        {#if loadingRoomCreation}
            <p>{$LL.chat.createRoom.loadingCreation()}</p>
        {:else}
            <button class="flex-1 justify-cente btn btn-contrast m-1" on:click={closeModal}
                >{$LL.chat.createRoom.buttons.cancel()}</button
            >
            <button
                data-testid="createRoomButton"
                class="disabled:text-gray-400  btn btn-secondary disabled:bg-gray-500 bg-secondary flex-1 justify-center m-1"
                disabled={createRoomOptions.name === undefined || createRoomOptions.name?.trim().length === 0}
                on:click={() => createNewRoom(createRoomOptions)}
                >{$LL.chat.createRoom.buttons.create()}
            </button>
        {/if}
    </svelte:fragment>
</Popup>
