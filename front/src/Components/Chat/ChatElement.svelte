<script lang="ts">
    import { ChatMessageTypes } from "../../Stores/ChatStore";
    import type { ChatMessage } from "../../Stores/ChatStore";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import ChatPlayerName from "./ChatPlayerName.svelte";
    import type { PlayerInterface } from "../../Phaser/Game/PlayerInterface";
    import {
        TranslationCache,
        translationCache,
        makeHash,
        hashExists,
        addHash,
        getContentFromHash,
    } from "../../Cache/TranslationCache";
import { resolve } from "path";

    export let message: ChatMessage;
    export let line: number;
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

    function showMyMessage(message: string): string {
        return urlifyText(message);
    }

    function showOtherPeopleMessage(message: string): string {
        const maybeUrlyfied = urlifyText(message);
        // Check if is a url
        if (maybeUrlyfied != message) {
            return maybeUrlyfied;
        }
        // Is not a url. Translate it
        return translate(message);
    }

    function makeRequest(
        url: string,
        method: string = "GET",
        headers: { [key: string]: any } = { "Content-Type": "application/x-www-form-urlencoded" }
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

    interface DeeplTranslationKey {
        detected_source_language: string;
        text: string;
    }

    interface DeeplResponse {
        translations: Array<DeeplTranslationKey>;
    }

    function translate(message: string, toLanguage = "fr"): string {
        // return new Promise(function (resolve, reject) {

        const hash: number = makeHash(toLanguage, message);
        console.log("main", message, hash, hashExists(hash) ? "true" : "false");
        if (hashExists(hash)) {
            const content: TranslationCache = getContentFromHash(hash);
            return content.translatedText;
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
                    addHash(hash, data.translations[0].text, data.translations[0].detected_source_language);
                    // resolve(data.translations[0].text);
                })
                .catch((err) => {
                    console.error(err);
                    // reject(err);
                });
        }

        // });
        return message;
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
                <div><p class="my-text">{@html showMyMessage(text)}</p></div>
            {/each}
        {:else}
            <h4><ChatPlayerName player={author} {line} />: <span class="date">({renderDate(message.date)})</span></h4>
            {#each texts as text}
                <div><p class="other-text">{@html showOtherPeopleMessage(text)}</p></div>
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
