<script>
    export let forum
</script>

<div class={`tw-flex tw-px-3 tw-mb-3 tw-items-center`}>
    <div class="tw-relative">
        <img class={``} src="/static/images/logo-wa-2.png" alt="Send" width="42" />
        {#if forum.active}
            <span
                class="tw-w-4 tw-h-4 tw-bg-pop-yellow tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1 tw-border-solid tw-border-2 tw-border-light-purple"
            />
        {/if}
    </div>
    <div class="tw-flex-auto tw-ml-2">
        <h1 class="tw-text-sm tw-font-bold tw-mb-0">
            {forum.name}
        </h1>
        <p class="tw-text-xs tw-mb-0 tw-text-green">
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
</div>