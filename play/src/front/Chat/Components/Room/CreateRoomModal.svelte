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
    <div slot="content" class="tw-w-full tw-flex tw-flex-col tw-gap-2">
        {#if loadingRoomCreation}
            <div class="tw-animate-[spin_2s_linear_infinite] tw-self-center">
                <IconLoader font-size="2em" />
            </div>
        {:else}
            {#if createRoomError !== undefined}
                <div class="tw-bg-red-500 tw-p-2 tw-rounded-md">
                    {$LL.chat.createRoom.error()} : <b><i>{createRoomError}</i></b>
                </div>
            {/if}
            <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createRoom.name()}</p>
            <input
                class="tw-w-full tw-rounded-xl tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-2 tw-p tw-border-light-purple tw-border tw-border-solid tw-bg-contrast"
                placeholder={$LL.chat.createRoom.name()}
                bind:value={createRoomOptions.name}
                on:focusin={focusChatInput}
                on:focusout={unfocusChatInput}
                data-testid="createRoomName"
            />
            <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createRoom.visibility.label()}</p>
            <select
                data-testid="createRoomVisibility"
                bind:value={createRoomOptions.visibility}
                class="tw-m-0 tw-bg-contrast tw-rounded-xl"
            >
                <option value="private">{$LL.chat.createRoom.visibility.private()}</option>
                <option value="public">{$LL.chat.createRoom.visibility.public()}</option>
                {#if parentID}
                    <option value="restricted">{$LL.chat.createRoom.visibility.restricted()}</option>
                {/if}
            </select>

            <p class="tw-text-xs tw-m-0 tw-p-0 tw-text-gray-400 tw-pl-1">
                <IconHelpCircle font-size={18} />
                {#if createRoomOptions.visibility === "private"}
                    {$LL.chat.createRoom.visibility.privateDescription()}
                {:else if createRoomOptions.visibility === "public"}
                    {$LL.chat.createRoom.visibility.publicDescription()}
                {:else if createRoomOptions.visibility === "restricted"}
                    {$LL.chat.createRoom.visibility.restrictedDescription()}
                {/if}
            </p>

            {#if true}
                <div class="tw-pl-1">
                    <input
                        data-testid="createRoomEncryption"
                        bind:checked={createRoomOptions.suggested}
                        type="checkbox"
                        id="suggestedData"
                        on:focusin={focusChatInput}
                        on:focusout={unfocusChatInput}
                    />
                    <label class="tw-m-0" for="suggestedData">{$LL.chat.createRoom.suggested()}</label>
                </div>
                <p class="tw-text-xs tw-m-0 tw-p-0 tw-text-gray-400 tw-pl-1">
                    <IconHelpCircle font-size={18} />
                    {$LL.chat.createRoom.suggestedDescription()}
                </p>
            {/if}
            {#if createRoomOptions.visibility === "private"}
                <div class="tw-pl-1">
                    <input
                        data-testid="createRoomEncryption"
                        bind:checked={createRoomOptions.encrypt}
                        type="checkbox"
                        id="encryptData"
                        on:focusin={focusChatInput}
                        on:focusout={unfocusChatInput}
                    />
                    <label class="tw-m-0" for="encryptData">{$LL.chat.createRoom.e2eEncryption.label()}</label>
                </div>
                <p class="tw-text-xs tw-m-0 tw-p-0 tw-text-gray-400 tw-pl-1">
                    <IconAlertTriangle font-size={18} />
                    {$LL.chat.createRoom.e2eEncryption.description()}
                </p>
            {/if}
            <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createRoom.users()}</p>
            <SelectMatrixUser
                on:error={handleSelectMatrixUserError}
                bind:value={createRoomOptions.invite}
                placeholder={$LL.chat.createRoom.users()}
            />

            <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createRoom.historyVisibility.label()}</p>
            {#each historyVisibilityOptions as historyVisibilityOption (historyVisibilityOption)}
                <label class="tw-m-0">
                    <input
                        bind:group={createRoomOptions.historyVisibility}
                        type="radio"
                        value={historyVisibilityOption}
                        name="historyVisibility"
                        on:focusin={focusChatInput}
                        on:focusout={unfocusChatInput}
                    />
                    {getHistoryTranslation(historyVisibilityOption)}
                </label>
            {/each}
        {/if}
    </div>

    <svelte:fragment slot="action">
        {#if loadingRoomCreation}
            <p>{$LL.chat.createRoom.loadingCreation()}</p>
        {:else}
            <button class="tw-flex-1 tw-justify-center" on:click={closeModal}
                >{$LL.chat.createRoom.buttons.cancel()}</button
            >
            <button
                data-testid="createRoomButton"
                class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
                disabled={createRoomOptions.name === undefined || createRoomOptions.name?.trim().length === 0}
                on:click={() => createNewRoom(createRoomOptions)}
                >{$LL.chat.createRoom.buttons.create()}
            </button>
        {/if}
    </svelte:fragment>
</Popup>
