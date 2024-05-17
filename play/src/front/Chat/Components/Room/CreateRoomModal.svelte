<script lang="ts">

    import { closeModal } from "svelte-modals";
    import { IconAlertTriangle, IconHelpCircle } from "@tabler/icons-svelte";
    import { get } from "svelte/store";
    import Select from "svelte-select";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import { CreateRoomOptions, historyVisibility, historyVisibilityOptions } from "../../Connection/ChatConnection";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import LL from "../../../../i18n/i18n-svelte";

    export let isOpen: boolean;
    let createRoomOptions: CreateRoomOptions = { visibility: "public" };
    let createRoomError: string;

    const chat = gameManager.getCurrentGameScene().chatConnection;

    async function createNewRoom(createRoomOptions: CreateRoomOptions) {
        try {
            await chat.createRoom(createRoomOptions);
            closeModal();
        } catch (error) {
            console.error(error);
            createRoomError = error.message;
        }
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

    async function searchMembers(filterText: string) {
            try {
               const chatUsers = await chat.searchChatUsers(filterText)
               if(chatUsers===undefined){
                   return []
               }
               return chatUsers.map(user=>({value:user.id,label:user.name ?? user.id}))
            } catch (error) {
                console.error(error);
            }

        return [];
    }

</script>


<Popup {isOpen}>
    <h1 slot="title">{$LL.chat.createRoom.title()}</h1>
    <div slot="content" class="tw-w-full tw-flex tw-flex-col tw-gap-2">
        {#if createRoomError !== undefined}
            <p>Unable to create the room.</p>
        {/if}
        <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createRoom.name()}</p>
        <input
            class="tw-w-full tw-rounded-xl tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-2 tw-p tw-border-light-purple tw-border tw-border-solid tw-bg-contrast"
            placeholder={$LL.chat.createRoom.name()}
            bind:value={createRoomOptions.name} />
        <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createRoom.visibility.label()}</p>
        <select bind:value={createRoomOptions.visibility} class="tw-m-0 tw-bg-contrast tw-rounded-xl">
            <option value="private">{$LL.chat.createRoom.visibility.private()}</option>
            <option value="public">{$LL.chat.createRoom.visibility.public()}</option>
        </select>
        <p class="tw-text-xs tw-m-0 tw-p-0 tw-text-gray-400 tw-pl-1">
            <IconHelpCircle size={18} />
            {#if createRoomOptions.visibility === "private"}
                {$LL.chat.createRoom.visibility.privateDescription()}
            {:else if createRoomOptions.visibility === "public"}
                {$LL.chat.createRoom.visibility.publicDescription()}
            {/if}
        </p> 
        {#if createRoomOptions.visibility === "private"}
            <div class="tw-pl-1">
                <input bind:value={createRoomOptions.encrypt} type="checkbox" id="encryptData" />
                <label class="tw-m-0" for="encryptData">{$LL.chat.createRoom.e2eEncryption.label()}</label>
            </div>
            <p class="tw-text-xs tw-m-0 tw-p-0 tw-text-gray-400 tw-pl-1">
                <IconAlertTriangle size={18} />
                {$LL.chat.createRoom.e2eEncryption.description()}
            </p>
        {/if}
        <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createRoom.users()}</p>
        <Select
            bind:value={createRoomOptions.invite}
            multiple
            class="!tw-border-light-purple tw-border tw-border-solid !tw-bg-contrast !tw-rounded-xl"
            inputStyles="box-shadow:none !important"
            --border-focused="2px solid rgb(146 142 187)"
            --input-color="white"
            --item-color="black"
            --item-hover-color="black"
            --clear-select-color="red"
            loadOptions={searchMembers}
            placeholder={$LL.chat.createRoom.users()}
        />
        <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.createRoom.historyVisibility.label()}</p>
        {#each historyVisibilityOptions as historyVisibilityOption (historyVisibilityOption)}
            <label class="tw-m-0">
                <input bind:group={createRoomOptions.historyVisibility} type="radio" value={historyVisibilityOption}
                       name="historyVisibility" />
                {getHistoryTranslation(historyVisibilityOption)}
            </label>
        {/each}


    </div>
    <svelte:fragment slot="action">
        <button class="tw-flex-1 tw-justify-center"
                on:click={closeModal}>{$LL.chat.createRoom.buttons.cancel()}</button>
        <button class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
                disabled={createRoomOptions.name === undefined || createRoomOptions.name?.trim().length === 0}
                on:click={()=>createNewRoom(createRoomOptions)}>{$LL.chat.createRoom.buttons.create()}
        </button>
    </svelte:fragment>
</Popup>


