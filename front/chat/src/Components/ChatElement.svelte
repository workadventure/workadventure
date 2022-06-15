<script lang="ts">
    import { ChatMessageTypes } from "../Stores/ChatStore";
    import type { ChatMessage } from "../Stores/ChatStore";
    import { HtmlUtils } from "../../../src/WebRtc/HtmlUtils";
    import ChatPlayerName from "./ChatPlayerName.svelte";
    import type { PlayerInterface } from "../../../src/Phaser/Game/PlayerInterface";

    export let message: ChatMessage;
    export let line: number;
    const chatStyleLink = "color: white; text-decoration: underline;";

    $: author = message.author as PlayerInterface;
    $: targets = message.targets || [];
    $: texts = message.text || [];

    let me = message.type !== ChatMessageTypes.me;

    function urlifyText(text: string): string {
        return HtmlUtils.urlify(text, chatStyleLink);
    }
    function renderDate(date: Date) {
        return date.toLocaleTimeString(navigator.language, {
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    function isLastIteration(index: number) {
        return targets.length - 1 === index;
    }
</script>

<div class="">
    <div class={`tw-flex ${me ? "tw-justify-end" : "tw-justify-start"}`}>
        <div class={`tw-w-3/4 tw-flex tw-items-start ${me ? "tw-flex-row-reverse" : ""}`}>
            {#if !me}
                <img class={`tw-mt-4 tw-mr-3`} src="/static/images/yoda-avatar.png" alt="Send" width="36" />
            {/if}
            <div class="tw-flex-auto">
                {#if message.type === ChatMessageTypes.userIncoming}
                    &gt;&gt; {#each targets as target, index}<ChatPlayerName
                            player={target}
                            {line}
                        />{#if !isLastIteration(index)}, {/if}{/each} entered
                    <span class="date">({renderDate(message.date)})</span>
                {:else if message.type === ChatMessageTypes.userOutcoming}
                    &lt;&lt; {#each targets as target, index}<ChatPlayerName
                            player={target}
                            {line}
                        />{#if !isLastIteration(index)}, {/if}{/each} left
                    <span class="date">({renderDate(message.date)})</span>
                {:else if message.type === ChatMessageTypes.me}
                    <div class="tw-px-2">
                        <div
                            class={`tw-flex tw-w-full tw-border-0 tw-border-b  tw-border-solid tw-text-xs tw-pb-1 ${
                                me ? "tw-border-b-pop-red" : "tw-border-light-blue"
                            }`}
                        >
                            <span class="tw-text-[#7d7b9e]"> Me </span>
                            <span class="tw-ml-auto tw-text-[#5c588c]">{renderDate(message.date)}</span>
                        </div>
                    </div>
                    <!-- <h4>Me: <span class="date">({renderDate(message.date)})</span></h4> -->
                    <div class="tw-flex tw-flex-col tw-space-y-2">
                        {#each texts as text}
                            <div class="tw-bg-dark tw-rounded tw-p-2 tw-text-sm">
                                <p class="tw-mb-0">{@html urlifyText(text)}</p>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <h4>
                        <ChatPlayerName player={author} {line} />:
                        <span class="date">({renderDate(message.date)})</span>
                    </h4>
                    {#each texts as text}
                        <div><p class="other-text">{@html urlifyText(text)}</p></div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    h4,
    p {
        font-family: Lato;
    }
</style>
