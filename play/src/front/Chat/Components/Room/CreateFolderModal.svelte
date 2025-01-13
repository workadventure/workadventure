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
    <div slot="content" class="tw-w-full tw-flex tw-flex-col tw-gap-2">
        {#if loadingFolderCreation}
            <div class="tw-animate-[spin_2s_linear_infinite] tw-self-center">
                <IconLoader font-size="2em" />
            </div>
        {:else}
            {#if createFolderError !== undefined}
                <div class="tw-bg-red-500 tw-p-2 tw-rounded-md">
                    {$LL.chat.createFolder.error()} : <b><i>{createFolderError}</i></b>
                </div>
            {/if}
            <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createFolder.name()}</p>
            <input
                class="tw-w-full tw-rounded-xl tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-2 tw-p tw-border-light-purple tw-border tw-border-solid tw-bg-contrast"
                placeholder={$LL.chat.createFolder.name()}
                bind:value={createFolderOptions.name}
                on:focusin={focusChatInput}
                on:focusout={unfocusChatInput}
                data-testid="createFolderName"
            />
            <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createFolder.visibility.label()}</p>
            <select
                data-testid="createFolderVisibility"
                bind:value={createFolderOptions.visibility}
                class="tw-m-0 tw-bg-contrast tw-rounded-xl"
            >
                <option value="private">{$LL.chat.createFolder.visibility.private()}</option>
                <option value="public">{$LL.chat.createFolder.visibility.public()}</option>
            </select>

            <p class="tw-text-xs tw-m-0 tw-p-0 tw-text-gray-400 tw-pl-1">
                <IconHelpCircle font-size={18} />
                {#if createFolderOptions.visibility === "private"}
                    {$LL.chat.createFolder.visibility.privateDescription()}
                {:else if createFolderOptions.visibility === "public"}
                    {$LL.chat.createFolder.visibility.publicDescription()}
                {/if}
            </p>
            <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">
                {$LL.chat.createFolder.description.label()}
            </p>
            <textarea
                class="tw-resize-none tw-w-full tw-rounded-xl tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-2 tw-p tw-border-light-purple tw-border tw-border-solid tw-bg-contrast"
                rows="4"
                bind:value={createFolderOptions.description}
                placeholder={$LL.chat.createFolder.description.label()}
                name="folderDescription"
                id=""
                on:keypress={() => {}}
            />
            <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createFolder.users()}</p>
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
            <button class="tw-flex-1 tw-justify-center" on:click={closeModal}
                >{$LL.chat.createFolder.buttons.cancel()}</button
            >
            <button
                data-testid="createFolderButton"
                class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
                disabled={createFolderOptions.name === undefined || createFolderOptions.name?.trim().length === 0}
                on:click={() => createNewFolder(createFolderOptions)}
                >{$LL.chat.createFolder.buttons.create()}
            </button>
        {/if}
    </svelte:fragment>
</Popup>
