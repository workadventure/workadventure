<script lang="ts">
    import { ChatMessageTypes } from "../../Stores/ChatStore";
    import type { ChatMessage } from "../../Stores/ChatStore";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import ChatPlayerName from "./ChatPlayerName.svelte";
    import type { PlayerInterface } from "../../Phaser/Game/PlayerInterface";
    import { TranslationCache, makeHash, hashExists, addHash, getContentFromHash } from "../../Cache/TranslationCache";
    import LL from "../../i18n/i18n-svelte";

    export let message: ChatMessage;
    export let line: number;
    export let translationEnabled: boolean;
    const chatStyleLink = "color: white; text-decoration: underline;";
    const authKey = "d4df4313-9277-6916-b60c-efd4b5ecc305:fx";

    $: author = message.author as PlayerInterface;
    $: targets = message.targets || [];
    $: texts = message.text || [];

    function urlifyText(text: string) {
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

    function showNoTranslatedMessage(message: string): string {
        console.log(translationEnabled)
        return urlifyText(message);
    }

    async function showTranslatedMessage(message: string): Promise<string> {
        const maybeUrlyfied = urlifyText(message);
        // Check if is a url
        if (maybeUrlyfied != message) {
            return maybeUrlyfied;
        }
        // Is not a url. Translate it
        return await translate(message);
    }

    function makeRequest(
        url: string,
        method: string = "GET",
        headers: { [key: string]: string } = { "Content-Type": "application/x-www-form-urlencoded" }
    ): Promise<XMLHttpRequest> {
        // Create the XHR request
        var request = new XMLHttpRequest();

        // Return it as a Promise
        return new Promise(function (resolve, reject) {
            // Setup our HTTP request
            request.open(method, url, true);

            // Set headers
            Object.keys(headers).forEach((headerName) => {
                const headerContent: string = headers[headerName];
                request.setRequestHeader(headerName, headerContent);
            });

            // Setup our listener to process compeleted requests
            request.onreadystatechange = function () {
                // Only run if the request is complete
                if (request.readyState !== 4) return;

                // Process the response
                if (request.status >= 200 && request.status < 300) {
                    // If successful
                    resolve(request);
                } else {
                    // If failed
                    reject({
                        status: request.status,
                        statusText: request.statusText,
                    });
                }
            };

            // Send the request
            request.send();
        });
    }

    interface DeeplTranslationEntry {
        detected_source_language: string;
        text: string;
    }

    interface DeeplResponse {
        translations: Array<DeeplTranslationEntry>;
    }

    function translate(message: string, toLanguage = "fr"): Promise<string> {
        return new Promise(function (resolve, reject) {
            const hash: number = makeHash(toLanguage, message);
            if (hashExists(hash)) {
                const content: TranslationCache = getContentFromHash(hash);
                resolve(content.translatedText);
            } else {
                makeRequest(
                    "https://api-free.deepl.com/v2/translate?auth_key=" +
                        authKey +
                        "&text=" +
                        message +
                        "&target_lang=" +
                        toLanguage,
                    "POST"
                )
                    .then((res) => {
                        const data: DeeplResponse = JSON.parse(res.responseText);
                        addHash(hash, data.translations[0].detected_source_language, data.translations[0].text);
                        resolve(data.translations[0].text);
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(err);
                    });
            }
        });
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
                    <div>{@html showNoTranslatedMessage(text)}</div>
                {/each}
            </div>
        {:else}
            <div class="card_white">
                <h4>
                    <ChatPlayerName player={author} {line} />: <span class="date">({renderDate(message.date)})</span>
                </h4>
                {#each texts as text}
                    <div class="blue-wa">{@html showNoTranslatedMessage(text)}</div>
                    {#if translationEnabled }
                        {#await showTranslatedMessage(text)}
                            <div class="red-wa">{@html $LL.chat.waitingTranslation()}</div>
                        {:then text}
                            <div class="red-wa">{@html text}</div>
                        {/await}
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .chatElement {
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

            // div > p {
            //     border-radius: 8px;
            //     margin-bottom: 10px;
            //     padding: 6px;
            //     overflow-wrap: break-word;
            //     max-width: 100%;
            //     display: inline-block;
            //     &.other-text {
            //         background: gray;
            //     }

            //     &.my-text {
            //         background: #6489ff;
            //     }
            // }
        }
    }
</style>
