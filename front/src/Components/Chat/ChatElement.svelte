<script lang="ts">
    import { ChatMessageTypes } from "../../Stores/ChatStore";
    import type { ChatMessage } from "../../Stores/ChatStore";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import ChatPlayerName from "./ChatPlayerName.svelte";
    import ChatPlayerAvatar from "./ChatPlayerAvatar.svelte";
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
            <div class="bubble-events">
                {#each targets as target, index}
                    <ChatPlayerName player={target} {line} />{#if !isLastIteration(index)}, {/if}{/each} entered
                <span class="date">{renderDate(message.date)}</span>
            </div>
        {:else if message.type === ChatMessageTypes.userOutcoming}
            <div class="bubble-events">
                {#each targets as target, index}
                    <ChatPlayerName player={target} {line} />{#if !isLastIteration(index)}, {/if}{/each} left
                <span class="date">{renderDate(message.date)}</span>
            </div>
        {:else if message.type === ChatMessageTypes.me}
            <ChatPlayerAvatar player={message.author} />
            <div class="messageInfos">
                <span class="author">Me</span> <span class="date">{renderDate(message.date)}</span>
                {#each texts as text}
                    <p class="message">{@html urlifyText(text)}</p>
                {/each}
            </div>
        {:else}
            <ChatPlayerAvatar player={author} />
            <div class="messageInfos">
                <ChatPlayerName player={author} {line} /> <span class="date">{renderDate(message.date)}</span>
                {#each texts as text}
                    <p class="message">{@html urlifyText(text)}</p>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    div.chatElement {
        display: flex;
        margin-bottom: 6px;

        .messagePart {
            flex-grow: 1;
            max-width: 100%;
            padding: 0;
            margin: 0;

            div.bubble-events {
                font-size: 12px;
                text-align: center;
            }

            div.messageInfos {
                margin-left: 12px;
                float: left;
            }

            span.author {
                font-weight: bold;
                color: #307abe;
            }

            span.date {
                font-size: 80%;
                color: gray;
            }

            p.message {
                word-break: break-all;
                max-width: 100%;
                font-size: 14px;
                margin-bottom: 6px;
            }
        }
    }
</style>
