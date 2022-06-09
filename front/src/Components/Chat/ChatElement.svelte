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

<div class="chatElement">
    <div class="messagePart">
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
            <div class="card_pink">
                <h4>Me: <span class="date">({renderDate(message.date)})</span></h4>
                {#each texts as text}
                    <div>{@html urlifyText(text)}</div>
                    <div class="blue-wa">{@html urlifyText(text)}</div>
                {/each}
            </div>
        {:else}
            <div class="card_white">
                <h4><ChatPlayerName player={author} {line} />: <span class="date">({renderDate(message.date)})</span></h4>
                {#each texts as text}
                    <div class="blue-wa">{@html urlifyText(text)}</div>
                    <div class="red-wa">{@html urlifyText(text)}</div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    h4,
    p {
        font-family: Lato;
    }

    .card_pink {
        background-color: #ff465a;
        border-radius: 0.5rem;
        padding: 0.5rem 1rem 0.5rem 1rem;
    }

    .card_white {
        background-color: #fff;
        border-radius: 0.5rem;
        padding: 0.5rem 1rem 0.5rem 1rem;
    }

    .blue-wa {
        color: #18314b;
    }

    .red-wa {
        color: #ff465a;
    }
    div.chatElement {
        display: flex;
        margin-bottom: 20px;
        position: relative;

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
