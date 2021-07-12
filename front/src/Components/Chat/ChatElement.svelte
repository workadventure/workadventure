<script lang="ts">
    import {ChatMessageTypes} from "../../Stores/ChatStore";
    import type {ChatMessage} from "../../Stores/ChatStore";
    import {HtmlUtils} from "../../WebRtc/HtmlUtils";
    import ChatPlayerName from './ChatPlayerName.svelte';
    import type {PlayerInterface} from "../../Phaser/Game/PlayerInterface";

    export let message: ChatMessage;
    
    $: author = message.author as PlayerInterface;
    $: targets = message.targets || [];
    $: texts = message.text || [];
    
    function urlifyText(text: string): string {
        return HtmlUtils.urlify(text)
    }
    function renderDate(date: Date) {
        return date.toLocaleTimeString(navigator.language, {
            hour: '2-digit',
            minute:'2-digit'
        });
    }
</script>

<div class="chatElement">
    <div class="messagePart">
        {#if message.type === ChatMessageTypes.userIncoming}
            &gt;&gt; {#each targets as target}<ChatPlayerName player={target}></ChatPlayerName>{/each} enter ({renderDate(message.date)})
        {:else if message.type === ChatMessageTypes.userOutcoming}
            &lt;&lt; {#each targets as target}<ChatPlayerName player={target}></ChatPlayerName>{/each} left ({renderDate(message.date)})
        {:else if message.type === ChatMessageTypes.me}
            <h4>Me: ({renderDate(message.date)})</h4>
            {#each texts as text}
                <div><p class="my-text">{@html urlifyText(text)}</p></div>
            {/each}
        {:else}
            <h4><ChatPlayerName player={author}></ChatPlayerName>: ({renderDate(message.date)})</h4>
            {#each texts as text}
                <div><p class="other-text">{@html urlifyText(text)}</p></div>
            {/each}
        {/if}
    </div>
</div>

<style lang="scss">
    h4, p {
        font-family: 'Whiteney';
    }
    div.chatElement {
      display: flex;
      margin-bottom: 20px;
      
      .messagePart {
        flex-grow:1;
        max-width: 100%;

        div > p {
          border-radius: 8px;
          margin-bottom: 10px;
          padding:6px;
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