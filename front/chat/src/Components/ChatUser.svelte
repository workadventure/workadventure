<script>
    import {MoreHorizontalIcon} from "svelte-feather-icons";

    export let user;
    export let openChat;
    let chatMenuActive = false;
    let openChatUserMenu = () => {
        chatMenuActive = true;
    };
    let closeChatUserMenu = () => {
        chatMenuActive = false;
    };
</script>

<div class={`wa-chat-item ${user.active ? "" : "tw-opacity-50"}`}
     on:mouseleave={closeChatUserMenu}
>
    <div class="tw-relative" on:click|stopPropagation={() => openChat(user)}>
        <img class="" src="/static/images/yoda-avatar.png" alt="Send" width="42"/>
        {#if user.active}
            <span class="tw-w-4 tw-h-4 tw-bg-pop-yellow tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1 tw-border-solid tw-border-2 tw-border-light-purple"/>
        {/if}
    </div>
    <div class="tw-flex-auto tw-ml-2" on:click|stopPropagation={() => openChat(user)}>
        <h1 class="tw-text-sm tw-font-bold tw-mb-0">
            {user.name}
        </h1>
        <p class="tw-text-xs tw-mb-0 tw-font-condensed">
            {user.status}
        </p>
    </div>

    {#if user.unreads}
        <span class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded">
            {user.unreads}
        </span>
    {/if}

    <div class="wa-dropdown">

        <!-- toggle -->

        <button class="tw-text-light-purple" on:click|stopPropagation={openChatUserMenu}>
            <MoreHorizontalIcon/>
        </button>

        <div class={`wa-dropdown-menu ${chatMenuActive ? '': 'tw-invisible'}`}
             on:mouseleave={closeChatUserMenu}
        >
            <span class="wa-dropdown-item" on:click|stopPropagation={() => openChat(user)}>
                Open Chat
            </span>
            <div class="wa-dropdown-item">
                Delete chat
            </div>
        </div>

    </div>
</div>
