<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../i18n/i18n-svelte";
    import { chatPeerConnectionInProgress, timelineMessagesToSee, showTimelineStore } from "../../Stores/ChatStore";

    const dispatch = createEventDispatcher();

    function open() {
        dispatch("activeThreadTimeLine");
    }

    $: unreadMessages = $timelineMessagesToSee;
</script>

<div id="timeline" class="bg-contrast/80">
    <div class="px-8 flex items-center" on:click={() => showTimelineStore.set(!$showTimelineStore)}>
        {#if unreadMessages}
            <div class=" pb-4 mt-8">
                <span
                    class="bg-secondary text-white w-6 h-6 mr-2 text-xs font-bold flex items-center justify-center rounded-full"
                >
                    {unreadMessages}
                </span>
            </div>
        {/if}
        <div class="font-title font-lg uppercase opacity-50 pb-4 mt-8">
            {$LL.timeLine.title()}
        </div>
        <!--
        <button
            class="text-lighter-purple"
            on:click|stopPropagation={() => showTimelineStore.set(!$showTimelineStore)}
        >
            <ChevronUpIcon class={`transform transition ${$showTimelineStore ? "" : "rotate-180"}`} />
        </button>
        -->
    </div>
    <div class="px-4">
        <div
            class="wa-chat-item flex rounded bg-white/10 transition-all hover:bg-white/20 pl-4 py-2 pr-2 items-center cursor-pointer"
        >
            <div id="openTimeline" class="relative" on:click|stopPropagation={open}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="icon icon-tabler icon-tabler-message-search"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="#ffffff"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M8 9h8" />
                    <path d="M8 13h5" />
                    <path
                        d="M11.008 19.195l-3.008 1.805v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v4.5"
                    />
                    <path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                    <path d="M20.2 20.2l1.8 1.8" />
                </svg>
                <!-- use chat store and get new notification -->
                {#if $chatPeerConnectionInProgress}
                    <div class="block absolute right-0 top-0 transform translate-x-2 -translate-y-1">
                        <div class="block relative">
                            <span class="w-4 h-4 bg-pop-green block rounded-full absolute right-0 top-0 animate-ping" />
                            <span class="w-3 h-3 bg-pop-green block rounded-full absolute right-0.5 top-0.5" />
                        </div>
                    </div>
                {/if}
            </div>
            <div class="flex-auto ml-4 grow leading-5" on:click|stopPropagation={open}>
                <div class="text-lg font-bold mb-0 leading-5">
                    {$LL.timeLine.title()}
                </div>
                <div class="text-xs text-white/50 mt-0">
                    {$LL.timeLine.open()}
                </div>
            </div>
            {#if unreadMessages}
                <span class="bg-secondary text-white w-6 h-6 text-xs flex items-center justify-center rounded-full">
                    {unreadMessages}
                </span>
            {/if}
            <div class="wa-dropdown">
                <!-- toggle -->
                <button class="m-0 btn btn-white btn-ghost">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler icon-tabler-chevron-right"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="#ffffff"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M9 6l6 6l-6 6" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</div>
