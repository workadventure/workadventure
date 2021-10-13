<script lang="ts">
    import {ChatMessageTypes} from "../../Stores/ChatStore";
    import type {ChatMessage} from "../../Stores/ChatStore";
    import {HtmlUtils} from "../../WebRtc/HtmlUtils";
    import ChatPlayerName from './ChatPlayerName.svelte';
    import type {PlayerInterface} from "../../Phaser/Game/PlayerInterface";

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
            hour: '2-digit',
            minute:'2-digit'
        });
    }
    function isLastIteration(index: number) {
        return targets.length -1 === index;
    }
</script>

<div class="chatElement">
    <div class="messagePart">
        {#if message.type === ChatMessageTypes.userIncoming}
            <div class="bubble-events">
            {#each targets as target, index}
                <ChatPlayerName player={target} line={line}></ChatPlayerName>{#if !isLastIteration(index)}, {/if}{/each} entered <span class="date">{renderDate(message.date)}</span>
            </div>
        {:else if message.type === ChatMessageTypes.userOutcoming}
            <div class="bubble-events">
            {#each targets as target, index}
                <ChatPlayerName player={target} line={line}></ChatPlayerName>{#if !isLastIteration(index)}, {/if}{/each} left <span class="date">{renderDate(message.date)}</span>
            </div>
        {:else if message.type === ChatMessageTypes.me}
            <div><span class="author">Me</span> <span class="date">{renderDate(message.date)}</span></div>
            {#each texts as text}
                <div><p class="message">{@html urlifyText(text)}</p></div>
            {/each}
        {:else}
            <div><ChatPlayerName player={author} line={line}></ChatPlayerName> <span class="date">{renderDate(message.date)}</span></div>
            {#each texts as text}
                <div><p>{@html urlifyText(text)}</p></div>
            {/each}
        {/if}
    </div>
</div>

<style lang="scss">
    div.chatElement {
      display: flex;
      margin-bottom: 10px;
      
      .messagePart {
        flex-grow:1;
        max-width: 100%;

        div.bubble-events {
          font-size: 12px;
          text-align: center;
        }

        span.author {
          font-weight: bold;
          color: #185186;
        }

        span.date {
          font-size: 80%;
          color: gray;
        }

        p.message {
          overflow-wrap: break-word;
          max-width: 100%;
          font-size: 15px;
          margin-bottom: 10px;
          display: inline-block;
        }
      }
    }
</style>