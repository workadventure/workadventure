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

<div id="timeline" class="tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple">
    <div class="tw-px-4 tw-py-1 tw-flex tw-items-center" on:click={() => showTimelineStore.set(!$showTimelineStore)}>
        {#if unreadMessages}
            <span
                class="tw-bg-pop-red tw-text-white tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded tw-animate-pulse"
            >
                {unreadMessages}
            </span>
        {/if}
        <p class="tw-text-light-blue tw-my-2 tw-text-sm tw-flex-auto">
            {$LL.timeLine.title()}
        </p>
        <!--
        <button
            class="tw-text-lighter-purple"
            on:click|stopPropagation={() => showTimelineStore.set(!$showTimelineStore)}
        >
            <ChevronUpIcon class={`tw-transform tw-transition ${$showTimelineStore ? "" : "tw-rotate-180"}`} />
        </button>
        -->
    </div>
    <div>
        <div class="wa-chat-item">
            <div id="openTimeline" class="tw-relative" on:click|stopPropagation={open}>
                <img src="./static/images/logo-wa-2.png" alt="Send" width="35" />

                <!-- use chat store and get new notification -->
                {#if $chatPeerConnectionInProgress}
                    <div
                        class="tw-block tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1"
                    >
                        <div class="tw-block tw-relative">
                            <span
                                class="tw-w-4 tw-h-4 tw-bg-pop-green tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-animate-ping"
                            />
                            <span
                                class="tw-w-3 tw-h-3 tw-bg-pop-green tw-block tw-rounded-full tw-absolute tw-right-0.5 tw-top-0.5"
                            />
                        </div>
                    </div>
                {/if}
            </div>
            <div class="tw-flex-auto tw-ml-2" on:click|stopPropagation={open}>
                <h1 class="tw-text-sm tw-font-bold tw-mb-0">
                    <span>{$LL.timeLine.title()}</span>
                </h1>
                <div class="tw-text-xs tw-text-lighter-purple tw-mt-0">
                    {$LL.timeLine.open()}
                </div>
            </div>
            {#if unreadMessages}
                <span
                    class="tw-bg-pop-red tw-text-white tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded tw-animate-pulse"
                >
                    {unreadMessages}
                </span>
            {/if}
        </div>
    </div>
</div>
