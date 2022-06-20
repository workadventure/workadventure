<script>
    export let forum;
    let forumMenuActive = false;
    export let openForum;
    let openChatForumMenu = () => {
        forumMenuActive = true;
    };
    let closeChatUserMenu = () => {
        forumMenuActive = false;
    };

    import { MoreHorizontalIcon } from "svelte-feather-icons";
</script>

<div class={`wa-chat-item`}
     on:mouseleave={closeChatUserMenu}
>
    <div class="tw-relative"  on:click|stopPropagation={() => openForum(forum)}>
        <img class={``} src="/static/images/logo-wa-2.png" alt="Send" width="42" />
        {#if forum.active}
            <span
                class="tw-w-4 tw-h-4 tw-bg-pop-yellow tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1 tw-border-solid tw-border-2 tw-border-light-purple"
            />
        {/if}
    </div>
    <div class="tw-flex-auto tw-ml-2"  on:click|stopPropagation={() => openForum(forum)}>
        <h1 class="tw-text-sm tw-font-bold tw-mb-0">
            {forum.name}
        </h1>
        <p class="tw-text-xs tw-font-condensed tw-mb-0 tw-text-green">
            <b>
                {forum.activeUsers}
            </b>
            <span>users online</span>
        </p>
    </div>

    {#if forum.unreads}
        <span
            class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
        >
            {forum.unreads}
        </span>
    {/if}

    <div class="wa-dropdown">
        <!-- toggle -->
        <button class="tw-text-light-purple" on:click={openChatForumMenu}>
            <MoreHorizontalIcon />
        </button>

        <!-- menu -->
        <div class={`wa-dropdown-menu ${forumMenuActive ? "" : "tw-invisible"}`}
             on:mouseleave={closeChatUserMenu}
        >
            <span class="wa-dropdown-item" on:click|stopPropagation={() => openForum(forum)}> Open forum </span>
            <div class="wa-dropdown-item">Delete forum</div>
        </div>
    </div>
</div>
