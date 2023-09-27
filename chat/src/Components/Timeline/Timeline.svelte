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

<div id="timeline" class="border-b border-solid border-0 border-transparent border-b-light-purple">
    <div class="px-4 py-1 flex items-center" on:click={() => showTimelineStore.set(!$showTimelineStore)}>
        {#if unreadMessages}
            <span
                class="bg-pop-red text-white w-5 h-5 mr-3 text-sm font-semibold flex items-center justify-center rounded animate-pulse"
            >
                {unreadMessages}
            </span>
        {/if}
        <p class="text-light-blue my-2 text-sm flex-auto">
            {$LL.timeLine.title()}
        </p>
        <!--
        <button
            class="text-lighter-purple"
            on:click|stopPropagation={() => showTimelineStore.set(!$showTimelineStore)}
        >
            <ChevronUpIcon class={`transform transition ${$showTimelineStore ? "" : "rotate-180"}`} />
        </button>
        -->
    </div>
    <div>
        <div class="wa-chat-item">
            <div id="openTimeline" class="relative" on:click|stopPropagation={open}>
                <img src="./static/images/logo-wa-2.png" alt="Send" width="35" />

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
            <div class="flex-auto ml-2" on:click|stopPropagation={open}>
                <h1 class="text-sm font-bold mb-0">
                    <span>{$LL.timeLine.title()}</span>
                </h1>
                <div class="text-xs text-lighter-purple mt-0">
                    {$LL.timeLine.open()}
                </div>
            </div>
            {#if unreadMessages}
                <span
                    class="bg-pop-red text-white w-5 h-5 mr-3 text-sm font-semibold flex items-center justify-center rounded animate-pulse"
                >
                    {unreadMessages}
                </span>
            {/if}
        </div>
    </div>
</div>
