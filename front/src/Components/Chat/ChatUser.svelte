<script>
    import { MoreHorizontalIcon } from "svelte-feather-icons";
    export let user;
</script>

<div class={`wa-chat-item ${user.active ? "" : "tw-opacity-50"}`}>
    <div class="tw-relative">
        <img class={``} src="/static/images/yoda-avatar.png" alt="Send" width="42" />
        {#if user.active}
            <span
                class="tw-w-4 tw-h-4 tw-bg-pop-yellow tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1 tw-border-solid tw-border-2 tw-border-light-purple"
            />
        {/if}
    </div>
    <div class="tw-flex-auto tw-ml-2">
        <h1 class="tw-text-sm tw-font-bold tw-mb-0">
            {user.name}
        </h1>
        <p class="tw-text-xs tw-mb-0 tw-font-condensed">
            {user.status}
        </p>
    </div>

    {#if user.unreads}
        <span
            class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
        >
            {user.unreads}
        </span>
    {/if}
    <div>
        <button class="tw-text-light-purple">
            <MoreHorizontalIcon />
        </button>
    </div>
</div>
