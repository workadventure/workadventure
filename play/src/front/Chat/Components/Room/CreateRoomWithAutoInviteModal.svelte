<script lang="ts">
    import { closeModal } from "svelte-modals";
    import { get } from "svelte/store";
    import Select from "svelte-select";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import { CreateRoomOptions, historyVisibility, historyVisibilityOptions } from "../../Connection/ChatConnection";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import LL from "../../../../i18n/i18n-svelte";
    import { IconAlertTriangle, IconHelpCircle, IconLoader } from "../../../Components/Icons";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import { searchChatMembersRule } from "./searchChatMembersRule";
    import InputTags from "../../../Components/Input/InputTags.svelte";

    export let isOpen: boolean;
    export let parentID: string | undefined;
    export let roomID : string | undefined;
    export let topic = "";
    export let memberTags: InputTagOption[] = [];
    export let moderatorTags: InputTagOption[] = [];
    export let createRoomOptions: CreateRoomOptions = { visibility: "public" , historyVisibility : "world_readable" };

    //TODO : passer du create au save .... 
    console.log({createRoomOptions});
    
    let createRoomError: string | undefined = undefined;
    
    // Store initial values to compare for changes
    let initialMemberTags = [...memberTags];
    let initialModeratorTags = [...moderatorTags];
    let initialHistoryVisibility = createRoomOptions.historyVisibility;

    const connection = gameManager.getCurrentGameScene().connection;
    const chat = gameManager.chatConnection;

    const { searchMembers } = searchChatMembersRule();

    let loadingRoomCreation = false;

    //TODO : revoir design tags input 
    async function createNewRoom() {
        try {
            createRoomError = undefined;
            loadingRoomCreation = true;
            if(!connection) return;
             connection.emitCreateAdminManageChatRoom(
                parentID,
                createRoomOptions.name,
                memberTags.map((tag)=>tag.value),
                moderatorTags.map((tag)=>tag.value),
                //TODO : voir pour rajouter le topic en champ ? 
                topic ?? "",
                createRoomOptions.historyVisibility

            );
            //TODO ; on n'utilise pas le roomId parce qu'on est pas sur que la personne qui crée la room est forcement le bon tag 
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

    function saveRoom(){
        try {
            createRoomError = undefined;
            loadingRoomCreation = true;
            if(!connection || !roomID) return;

            // Compare current values with initial values
            const updatedMemberTags = JSON.stringify(memberTags) !== JSON.stringify(initialMemberTags) 
                ? memberTags.map((tag)=>tag.value)
                : undefined;

            const updatedModeratorTags = JSON.stringify(moderatorTags) !== JSON.stringify(initialModeratorTags)
                ? moderatorTags.map((tag)=>tag.value)
                : undefined;

            const updatedHistoryVisibility = createRoomOptions.historyVisibility !== initialHistoryVisibility
                ? createRoomOptions.historyVisibility
                : undefined;

            connection.emitUpdateAdminManageChatRoom(
                roomID,
                updatedMemberTags,
                updatedModeratorTags,
                updatedHistoryVisibility,
                createRoomOptions.name
            );

            closeModal();
            notifyUserForRoomModification();
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

    function notifyUserForRoomModification() {
        notificationPlayingStore.playNotification("room modification !");
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
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.chat.createRoom.title() + ": admin" } 
        {#if roomID }
            / modification
        {/if}
    </h1>
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
            <InputTags label={"Member "+ $LL.mapEditor.settings.room.inputs.tags()} bind:value={memberTags} />
            <InputTags label={"Moderator " + $LL.mapEditor.settings.room.inputs.tags()} bind:value={moderatorTags} />
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
            {#if roomID}
            <button
            data-testid="saveRoomButton"
            class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
            disabled={createRoomOptions.name === undefined || createRoomOptions.name?.trim().length === 0 || memberTags.length === 0}
            on:click={saveRoom}
            >save
        </button>
            {:else}
                <button
                    data-testid="createRoomButton"
                    class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
                    disabled={createRoomOptions.name === undefined || createRoomOptions.name?.trim().length === 0 || memberTags.length === 0}
                    on:click={createNewRoom}
                    >{$LL.chat.createRoom.buttons.create()}
                </button>
            {/if}
        {/if}
    </svelte:fragment>
</Popup>
