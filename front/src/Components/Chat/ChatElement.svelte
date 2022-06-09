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

    function translate(text: string) {
        // let res = await fetch('https://api-free.deepl.com/v2/translate', {
        //     headers: {
        //         "Content-Type": "application/json",
        //         "auth_key": "d4df4313-9277-6916-b60c-efd4b5ecc305:fx",
        //         "text": "Hello world",
        //         "target_lang": "fr"
        //     }
        // })
        var url = "https://api-free.deepl.com/v2/translate";
        var xhr = new XMLHttpRequest();
        var auth_key = xhr.open("POST", url);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                console.log(xhr.status);
                console.log(xhr.responseText);
            }
        };
        var data = "auth_key=" + auth_key + "&text=" + message + "&target_lang=" + lang;
        xhr.send(data);

        xhr.onload = () => {
            var data = xhr.responseText;
            console.log(data)
        };
        return text;
    }

    function urlifyText(text: string) {
        debugger;
        const newText = HtmlUtils.urlify(text, chatStyleLink);
        if (newText != text) {
            return newText;
        }
        return text;
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
            <h4>Me: <span class="date">({renderDate(message.date)})</span></h4>
            {#each texts as text}
                <div><p class="my-text">{@html urlifyText(text)}</p></div>
            {/each}
        {:else}
            <h4><ChatPlayerName player={author} {line} />: <span class="date">({renderDate(message.date)})</span></h4>
            {#each texts as text}
                <div><p class="other-text">{@html urlifyText(text)}</p></div>
            {/each}
        {/if}
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
