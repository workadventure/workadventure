<script lang="ts">
    import { MoreHorizontalIcon } from "svelte-feather-icons";
    import LL from "../i18n/i18n-svelte";
    import {createEventDispatcher} from "svelte";
    import {userStore} from "../Stores/LocalUserStore";
    const dispatch = createEventDispatcher();

    export let user;
    export let openChat;
    let chatMenuActive = false;
    let openChatUserMenu = () => {
        chatMenuActive = true;
    };
    let closeChatUserMenu = () => {
        chatMenuActive = false;
    };
    function goTo(type: string, roomId: string, uuid: string) {
        dispatch("goTo", { type, roomId, uuid });
    }
</script>

<div class={`wa-chat-item`} on:click|stopPropagation={() => openChat(user)} on:mouseleave={closeChatUserMenu}>
    <div class={`tw-relative wa-avatar ${user.active ? "" : "tw-opacity-50"}`} style={`background-color: ${user.color}`} on:click|stopPropagation={() => openChat(user)}>
        <div class="tw-overflow-hidden tw-w-full tw-h-full">
            <img class="tw-w-full" src={user.woka} alt="Avatar"/>
        </div>
        {#if user.active}
            <span class="tw-w-4 tw-h-4 tw-bg-pop-green tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1 tw-border-solid tw-border-2 tw-border-light-purple"></span>
        {/if}
    </div>
    <div class={`tw-flex-auto tw-ml-2 ${user.active ? "" : "tw-opacity-50"}`} on:click|stopPropagation={() => openChat(user)}>
        <h1 class="tw-text-sm tw-font-bold tw-mb-0">
            {#if user.name.match(/\[\d*]/)}
                <span>{user.name.substring(0, user.name.search(/\[\d*]/))}</span>
                <span class="tw-font-light tw-text-xs tw-text-gray">
                    #{user.name
                        .match(/\[\d*]/)
                        ?.join()
                        ?.replace("[", "")
                        ?.replace("]", "")}
                </span>
            {:else}
                <span>{user.name}</span>
            {/if}
        </h1>
        <p class="tw-text-xs tw-mb-0 tw-font-condensed">
            {#if user.active}
                {user.isInSameMap?$LL.userList.isHere():$LL.userList.isOverThere()}
            {:else}
                {$LL.userList.disconnected()}
            {/if}
        </p>
    </div>

    {#if user.unreads}
        <span
            class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
        >
            {user.unreads}
        </span>
    {/if}

    <div class="wa-dropdown">
        <button class="tw-text-light-purple focus:outline-none tw-m-0" on:click|stopPropagation={openChatUserMenu}>
            <MoreHorizontalIcon />
        </button>
        <!-- on:mouseleave={closeChatUserMenu} -->
        <div class={`wa-dropdown-menu ${chatMenuActive ? "" : "tw-invisible"}`} on:mouseleave={closeChatUserMenu}>
            {#if user.active}
                {#if user.isInSameMap}
                    <span class="wa-dropdown-item" on:click|stopPropagation={() => goTo("user", user.roomId, user.uuid)}>{$LL.userList.walkTo()}</span>
                {:else}
                    <span class="wa-dropdown-item" on:click|stopPropagation={() => goTo("room", user.roomId, user.uuid)}>{$LL.userList.teleport()}</span>
                {/if}
            {/if}
            <span class="wa-dropdown-item" on:click|stopPropagation={() => openChat(user)}> Open Chat </span>
            <div class="wa-dropdown-item">Delete chat</div>
        </div>
    </div>
</div>
