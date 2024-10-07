<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { navChat } from "../Stores/ChatStore";
    //import { chatSearchBarValue, joignableRoom } from "../Stores/ChatStore";
    import { INITIAL_SIDEBAR_WIDTH } from "../../Stores/ChatStore";
    //import { UserProviderMerger } from "../UserProviderMerger/UserProviderMerger";
    import RoomUserList from "./UserList/RoomUserList.svelte";
    import RoomList from "./RoomList.svelte";
    //import { IconShieldLock } from "@wa-icons";

    export let sideBarWidth: number = INITIAL_SIDEBAR_WIDTH;

    const gameScene = gameManager.getCurrentGameScene();
    //const chat = gameManager.chatConnection;
    const userProviderMergerPromise = gameScene.userProviderMerger;
    //const DONE_TYPING_INTERVAL = 2000;

    //let searchValue = "";
    //let typingTimer: ReturnType<typeof setTimeout>;

    // TODO HUGO
    // Use commented code for search bar : moved somewhere else
    /*
    const handleKeyUp = (userProviderMerger: UserProviderMerger) => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            searchLoader = true;
            if ($navChat === "chat" && $chatSearchBarValue.trim() !== "") {
                searchAccessibleRooms();
            }

            userProviderMerger.setFilter($chatSearchBarValue).finally(() => {
                searchLoader = false;
            });
        }, DONE_TYPING_INTERVAL);
    };

    const handleKeyDown = () => {
        if (searchValue === "") joignableRoom.set([]);
        clearTimeout(typingTimer);
    };

    const searchAccessibleRooms = () => {
        chat.searchAccessibleRooms($chatSearchBarValue)
            .then((chatRooms: { id: string; name: string | undefined }[]) => {
                joignableRoom.set(chatRooms);
            })
            .finally(() => {
                searchLoader = false;
            });
        return;
    };
    */
</script>

<div class="tw-flex tw-flex-col tw-h-full">
    <div id="chatModal" class="tw-absolute tw-to-50%" />
    <div class="tw-flex tw-flex-col tw-gap-2 !tw-flex-1 tw-min-h-0">
        {#if $navChat === "users"}
            {#await userProviderMergerPromise}
                <div />
            {:then userProviderMerger}
                <RoomUserList {userProviderMerger} />
            {/await}
        {:else}
            <RoomList {sideBarWidth} />
        {/if}
    </div>
</div>
