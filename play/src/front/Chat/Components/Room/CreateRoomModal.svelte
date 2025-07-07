<script lang="ts">
    import { closeModal } from "svelte-modals";
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import { CreateRoomOptions, historyVisibility, historyVisibilityOptions } from "../../Connection/ChatConnection";
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

    export let isOpen: boolean;
    export let parentID: string | undefined;
    let createRoomOptions: CreateRoomOptions = {
        visibility: "private",
        historyVisibility: historyVisibilityOptions[0], // Default to "joined"
    };
    if (parentID) {
        createRoomOptions.parentSpaceID = parentID;
        createRoomOptions.visibility = "restricted"; // Set to folder members only
    }
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
    <h1 slot="title">
        {#if parentID}
            {$LL.chat.createRoom.title()}
        {:else}
            {$LL.chat.createRoom.rootTitle()}
        {/if}
    </h1>
    <div slot="content" class="w-full flex flex-col gap-5">
        {#if parentID}
            <span class="p-3 flex flex-row items-center gap-2 bg-white/10 rounded mt-3">
                <IconInfoCircle />
                {$LL.chat.createRoom.restrictedDescription({ folderName: get(chat.getRoomByID(parentID).name) })}
            </span>
        {/if}
        {#if loadingRoomCreation}
            <!--            <div class="animate-[spin_2s_linear_infinite] self-center">-->
            <!--                <IconLoader font-size="2em" />-->
            <!--            </div>-->
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
                    on:focusin={focusChatInput}
                    on:focusout={unfocusChatInput}
                />

                {#if parentID}
                    <div>
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
                                on:focusin={focusChatInput}
                                on:focusout={unfocusChatInput}
                            />
                        </div>
                        <p class="text-xs m-0 p-0 text-gray-400 flex items-center ">
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
                        on:error={handleSelectMatrixUserError}
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
                            on:focusin={focusChatInput}
                            on:focusout={unfocusChatInput}
                            label={getHistoryTranslation(historyVisibilityOption)}
                        />
                    </label>
                {/each}
            </div>
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
                disabled={createRoomOptions.name === undefined ||
                    createRoomOptions.name?.trim().length === 0 ||
                    (createRoomOptions.visibility === "private" && (createRoomOptions.invite?.length ?? 0) < 1)}
                on:click={() => createNewRoom(createRoomOptions)}
                >{$LL.chat.createRoom.buttons.create()}
            </button>
        {/if}
    </svelte:fragment>
</Popup>
