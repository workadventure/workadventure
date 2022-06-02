<script lang="ts">
    import { ChatMessageTypes } from "../../Stores/ChatStore";
    import type { ChatMessage } from "../../Stores/ChatStore";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import ChatPlayerName from "./ChatPlayerName.svelte";
    import type { PlayerInterface } from "../../Phaser/Game/PlayerInterface";

    export let message: ChatMessage;
    export let line: number;
    const chatStyleLink = "color: white; text-decoration: underline;";

    $: author = message.author as PlayerInterface;
    $: targets = message.targets || [];
    $: texts = message.text || [];

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
    <div
        class={`tw-flex ${
            message.type == ChatMessageTypes.me ? "tw-justify-start" : "tw-justify-end"
        }`}
    >
        <div class="tw-w-3/4">
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
                    <div class="tw-flex tw-w-full tw-border-0 tw-border-b tw-border-b-pop-red tw-border-solid tw-text-xs tw-pb-1">
                        <span class="tw-text-[#7d7b9e]"> Me </span>
                        <span class="tw-ml-auto tw-text-[#5c588c]">{renderDate(message.date)}</span>
                    </div>
                </div>
                <!-- <h4>Me: <span class="date">({renderDate(message.date)})</span></h4> -->
                <div class="tw-flex tw-flex-col tw-space-y-2">
                    {#each texts as text}
                        <div class="tw-bg-dark tw-rounded tw-p-2 tw-text-sm"><p class="tw-mb-0">{@html urlifyText(text)}</p></div>
                    {/each}

                </div>
            {:else}
                <h4>
                    <ChatPlayerName player={author} {line} />: <span class="date">({renderDate(message.date)})</span>
                </h4>
                {#each texts as text}
                    <div><p class="other-text">{@html urlifyText(text)}</p></div>
                {/each}
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    h4,
    p {
        font-family: Lato;
    }
    div.chatElement {
        display: flex;
        margin-bottom: 20px;

        .messagePart {
            flex-grow: 1;
            max-width: 100%;
            user-select: text;

            span.date {
                font-size: 80%;
                color: gray;
            }

            div > p {
                border-radius: 8px;
                margin-bottom: 10px;
                padding: 6px;
                overflow-wrap: break-word;
                max-width: 100%;
                display: inline-block;
                &.other-text {
                    background: gray;
                }

                &.my-text {
                    background: #6489ff;
                }
            }
        }
    }
</style>
