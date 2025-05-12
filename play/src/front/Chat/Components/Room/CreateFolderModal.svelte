<script lang="ts">
    import { closeModal } from "svelte-modals";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import { CreateRoomOptions } from "../../Connection/ChatConnection";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import LL from "../../../../i18n/i18n-svelte";
    import { IconHelpCircle, IconLoader } from "../../../Components/Icons";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import SelectMatrixUser from "../SelectMatrixUser.svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    export let isOpen: boolean;
    export let parentID: string | undefined;
    let createFolderOptions: CreateRoomOptions = { visibility: "public", description: "" };
    if (parentID) createFolderOptions.parentSpaceID = parentID;
    let createFolderError: string | undefined = undefined;

    const chat = gameManager.chatConnection;

    let loadingFolderCreation = false;

    async function createNewFolder(createFolderOptions: CreateRoomOptions) {
        try {
            createFolderError = undefined;
            loadingFolderCreation = true;
            await chat.createFolder(createFolderOptions);
            closeModal();
            notifyUserForFolderCreation();
        } catch (error) {
            console.error(error);
            if (error instanceof Error) {
                createFolderError = error.message;
            } else {
                createFolderError = "Unknown error";
            }
        } finally {
            loadingFolderCreation = false;
            analyticsClient.createMatrixFolder();
        }
    }

    function notifyUserForFolderCreation() {
        notificationPlayingStore.playNotification($LL.chat.createFolder.creationSuccessNotification());
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
        createFolderError = e.detail.error;
    }
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.chat.createFolder.title()}</h1>
    <div slot="content" class="w-full flex flex-col gap-2">
        {#if loadingFolderCreation}
            <div class="animate-[spin_2s_linear_infinite] self-center">
                <IconLoader font-size="2em" />
            </div>
        {:else}
            {#if createFolderError !== undefined}
                <div class="bg-red-500 p-2 rounded">
                    {$LL.chat.createFolder.error()} : <b><i>{createFolderError}</i></b>
                </div>
            {/if}
            <p class="p-0 m-0 pl-1 font-bold">{$LL.chat.createFolder.name()}</p>
            <input
                class="w-full rounded-md text-white placeholder:text-sm px-3 py-2 p border-light-purple border border-solid bg-contrast"
                placeholder={$LL.chat.createFolder.name()}
                bind:value={createFolderOptions.name}
                on:focusin={focusChatInput}
                on:focusout={unfocusChatInput}
                data-testid="createFolderName"
            />
            <p class="p-0 m-0 pl-1 font-bold">{$LL.chat.createFolder.visibility.label()}</p>
            <select
                data-testid="createFolderVisibility"
                bind:value={createFolderOptions.visibility}
                class="m-0 bg-contrast rounded-md"
            >
                <option value="private">{$LL.chat.createFolder.visibility.private()}</option>
                <option value="public">{$LL.chat.createFolder.visibility.public()}</option>
            </select>

            <p class="text-xs m-0 p-0 text-gray-400 pl-1">
                <IconHelpCircle font-size={18} />
                {#if createFolderOptions.visibility === "private"}
                    {$LL.chat.createFolder.visibility.privateDescription()}
                {:else if createFolderOptions.visibility === "public"}
                    {$LL.chat.createFolder.visibility.publicDescription()}
                {/if}
            </p>
            <p class="p-0 m-0 pl-1 font-bold">
                {$LL.chat.createFolder.description.label()}
            </p>
            <textarea
                class="resize-none w-full rounded-md text-white placeholder:text-sm px-3 py-2 p border-light-purple border border-solid bg-contrast"
                rows="4"
                bind:value={createFolderOptions.description}
                placeholder={$LL.chat.createFolder.description.label()}
                name="folderDescription"
                id=""
                on:keypress={() => {}}
            />
            <p class="p-0 m-0 pl-1 font-bold">{$LL.chat.createFolder.users()}</p>
            <SelectMatrixUser
                on:error={handleSelectMatrixUserError}
                bind:value={createFolderOptions.invite}
                placeholder={$LL.chat.createFolder.users()}
            />
        {/if}
    </div>

    <svelte:fragment slot="action">
        {#if loadingFolderCreation}
            <p>{$LL.chat.createFolder.loadingCreation()}</p>
        {:else}
            <button class="btn btn-contrast flex-1 justify-center" on:click={closeModal}
                >{$LL.chat.createFolder.buttons.cancel()}</button
            >
            <button
                data-testid="createFolderButton"
                class="btn btn-secondary disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
                disabled={createFolderOptions.name === undefined || createFolderOptions.name?.trim().length === 0}
                on:click={() => createNewFolder(createFolderOptions)}
                >{$LL.chat.createFolder.buttons.create()}
            </button>
        {/if}
    </svelte:fragment>
</Popup>
