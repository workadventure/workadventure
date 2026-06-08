<script lang="ts">
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import type { CreateRoomOptions } from "../../Connection/ChatConnection";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import LL from "../../../../i18n/i18n-svelte";
    import { IconLoader } from "../../../Components/Icons";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import SelectMatrixUser from "../SelectMatrixUser.svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import Input from "../../../Components/Input/Input.svelte";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        parentID: string | undefined;
    }

    let { isOpen, parentID }: Props = $props();
    let createFolderOptions: CreateRoomOptions = $state(
        (() => {
            const options: CreateRoomOptions = { visibility: "private", description: "" };
            if (parentID) {
                options.parentSpaceID = parentID;
                options.visibility = "restricted";
            }
            return options;
        })(),
    );
    let createFolderError: string | undefined = $state(undefined);

    const chat = gameManager.chatConnection;

    let loadingFolderCreation = $state(false);

    async function createNewFolder(createFolderOptions: CreateRoomOptions) {
        try {
            createFolderError = undefined;
            loadingFolderCreation = true;
            await chat.createFolder(createFolderOptions);
            modals.close();
            notifyUserForFolderCreation();
        } catch (error) {
            console.error(error);
            if (error instanceof Error) {
                createFolderError = error.message;
            } else {
                createFolderError = get(LL).chat.unknownError();
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

    function handleSelectMatrixUserError(error: string) {
        createFolderError = error;
    }
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1>{$LL.chat.createFolder.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col gap-2">
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
                <Input
                    data-testid="createFolderName"
                    label={$LL.chat.createFolder.name()}
                    placeholder={$LL.chat.createFolder.name()}
                    bind:value={createFolderOptions.name}
                    onfocusin={focusChatInput}
                    onfocusout={unfocusChatInput}
                />

                {#if parentID}
                    <p class="p-0 m-0 pl-1 font-bold">{$LL.chat.createFolder.visibility.label()}</p>
                    <select
                        data-testid="createFolderVisibility"
                        bind:value={createFolderOptions.visibility}
                        class="m-0 bg-contrast rounded-md border-contrast-400"
                    >
                        <option value="private">{$LL.chat.createFolder.visibility.private()}</option>
                        <option value="restricted">{$LL.chat.createFolder.visibility.restricted()}</option>
                    </select>
                {/if}
                <p class="p-0 m-0 pl-1 font-bold">
                    {$LL.chat.createFolder.description.label()}
                </p>
                <textarea
                    class="resize-none w-full rounded-md text-white placeholder:text-sm placeholder:text-contrast-400 px-3 py-2 p border-contrast-400 border border-solid bg-contrast"
                    rows="4"
                    bind:value={createFolderOptions.description}
                    placeholder={$LL.chat.createFolder.description.label()}
                    name="folderDescription"
                    id=""
                    onkeypress={() => {}}
                ></textarea>
                {#if createFolderOptions.visibility === "private"}
                    <div class="flex flex-col items-start gap-1">
                        <div class="input-label">
                            <span>{$LL.chat.createFolder.users()}</span>
                        </div>
                        <SelectMatrixUser
                            onerror={handleSelectMatrixUserError}
                            bind:value={createFolderOptions.invite}
                            placeholder={$LL.chat.createFolder.users()}
                        />
                    </div>
                {/if}
            {/if}
        </div>
    {/snippet}

    {#snippet action()}
        {#if loadingFolderCreation}
            <p>{$LL.chat.createFolder.loadingCreation()}</p>
        {:else}
            <button class="btn btn-contrast flex-1 justify-center" onclick={() => modals.close()}
                >{$LL.chat.createFolder.buttons.cancel()}</button
            >
            <button
                data-testid="createFolderButton"
                class="btn btn-secondary disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
                disabled={createFolderOptions.name === undefined || createFolderOptions.name?.trim().length === 0}
                onclick={() => createNewFolder(createFolderOptions)}
                >{$LL.chat.createFolder.buttons.create()}
            </button>
        {/if}
    {/snippet}
</Popup>
