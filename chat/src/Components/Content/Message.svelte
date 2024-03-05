<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { AlertCircleIcon, RefreshCwIcon, Trash2Icon, LoaderIcon } from "svelte-feather-icons";
    import { Writable } from "svelte/store";
    import { EmojiButton } from "@joeattardi/emoji-button";
    import { JID } from "stanza";
    import { onMount } from "svelte";
    import { MucRoom } from "../../Xmpp/MucRoom";
    import { Message } from "../../Model/Message";
    import { LL, locale } from "../../i18n/i18n-svelte";
    import { selectedMessageToReact, selectedMessageToReply } from "../../Stores/ChatStore";
    import { HtmlUtils } from "../../Utils/HtmlUtils";
    import { User } from "../../Xmpp/AbstractRoom";
    import { iframeListener } from "../../IframeListener";
    import { FileMessageManager } from "../../Services/FileMessageManager";
    import HtmlMessage from "./HtmlMessage.svelte";
    import File from "./File.svelte";
    import Reactions from "./Reactions.svelte";

    export let mucRoom: MucRoom;
    export let message: Message;
    export let picker: EmojiButton;
    export let emojiContainer: HTMLElement;
    export let isMe: boolean;
    export let color: string;
    export let woka: string;
    export let needHideHeader: boolean;
    export let me: Writable<User> | undefined;
    let html: string;
    let urlifyError: string;
    let embedLink: string | undefined;
    let loadingDownload = false;

    const deletedMessagesStore = mucRoom.getDeletedMessagesStore();

    const delivered = message.delivered;
    const error = message.error;

    function selectMessage(message: Message) {
        selectedMessageToReply.set(message);
    }

    function reactMessage(message: Message) {
        //open emoji dropdown
        setTimeout(() => picker.showPicker(emojiContainer), 100);
        selectedMessageToReact.set(message);
    }

    function copyMessage(e: Event, message: Message) {
        navigator.clipboard
            .writeText(message.body)
            .then(() => {
                const target = e.target as HTMLElement;
                if (target) {
                    target.classList.add("text-pop-green");
                    const originalText = target.innerHTML;
                    target.innerHTML = originalText.replace($LL.copy(), $LL.copied());
                    setTimeout(() => {
                        target.innerHTML = originalText;
                        target.classList.remove("text-pop-green");
                    }, 1_000);
                }
            })
            .catch((err) => {
                console.error("error copy message => ", err);
            });
    }

    function scrollToMessage(messageId?: string) {
        if (!messageId) return;
        const messageElement = document.getElementById(`message_${messageId}`);
        if (!messageElement) return;
        messageElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    function openCowebsite() {
        if (embedLink) iframeListener.openCoWebsite(embedLink, true, "allowfullscreen");
        if (message.links)
            message.links.forEach((link) => iframeListener.openCoWebsite(link.url, true, "allowfullscreen"));
    }

    function downloadAllFile() {
        if (message.links == undefined) return;
        message.links.forEach((link) => {
            download(link.url, link.description);
        });
    }

    function download(url: string, name?: string) {
        loadingDownload = true;
        fetch(url, { method: "GET" })
            .then((res) => {
                return res.blob();
            })
            .then((blob) => {
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = name ?? FileMessageManager.getName(url);
                document.body.appendChild(a);
                a.click();
                setTimeout((_) => {
                    URL.revokeObjectURL(url);
                }, 60000);
                a.remove();
                loadingDownload = false;
            })
            .catch((err) => {
                loadingDownload = false;
                console.error("err: ", err);
            });
    }

    onMount(() => {
        HtmlUtils.urlify(message.body)
            .then((htmlFromBody) => {
                html = htmlFromBody;

                // check if the message html body contains attribute embed-link
                // if yes, capture the embed-link value and store it in embedLink variable
                const embedLinkMatching = html.match(/embed-link="(.*)"/);
                if (embedLinkMatching) {
                    // if embed link add a new action in actions element to open the embed link into WorkAdventure
                    embedLink = embedLinkMatching[1];
                }
            })
            .catch((err) => {
                urlifyError = err.message;
            });
    });

    /* eslint-disable svelte/no-at-html-tags */
</script>

<div
    id={`message_${message.id}`}
    class="wa-message flex group
            {isMe ? 'right' : 'left'}
            {isMe ? 'justify-end' : 'justify-start'}
            {needHideHeader ? 'mt-0.5' : 'mt-2'}
            {isMe ? ($delivered ? 'sent' : 'sending') : 'received'}"
>
    <div class="flex flex-row items-center max-w-full">
        <div class={`flex max-w-full ${isMe ? "justify-end" : "justify-start"}`}>
            {#if !isMe}
                <div
                    class={`${
                        isMe || needHideHeader ? "opacity-0" : "mt-6"
                    } relative wa-avatar aspect-ratio h-10 w-10 rounded overflow-hidden false cursor-default mr-2`}
                    in:fade={{ duration: 100 }}
                    style={`background-color: ${color}`}
                >
                    <div class="wa-container cursor-default">
                        <img
                            class="cursor-default w-full mt-2"
                            style="image-rendering: pixelated;"
                            src={woka}
                            alt="Avatar"
                            loading="lazy"
                        />
                    </div>
                </div>
            {/if}
            {#if !$error && !$deletedMessagesStore.has(message.id)}
                <!-- Action bar -->
                <div
                    class="actions invisible justify-between text-xs text-left flex mt-3 pt-4 {isMe
                        ? 'pr-2 flex-row-reverse'
                        : 'order-3 pl-2 flex-row'}"
                >
                    {#if message.links != undefined && message.links.length > 0}
                        <div
                            class="action reply aspect-square h-8 w-8 bg-contrast/80 rounded-full mr-1 text-center flex justify-center items-center relative cursor-pointer"
                            on:click={() => downloadAllFile()}
                            transition:fly={{
                                x: 50,
                                delay: 100,
                                duration: 200,
                            }}
                        >
                            {#if loadingDownload}
                                <LoaderIcon size="17" />
                            {:else}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="icon icon-tabler icon-tabler-cloud-download"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="#ffffff"
                                    fill="none"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                    <path d="M19 18a3.5 3.5 0 0 0 0 -7h-1a5 4.5 0 0 0 -11 -2a4.6 4.4 0 0 0 -2.1 8.4" />
                                    <path d="M12 13l0 9" />
                                    <path d="M9 19l3 3l3 -3" />
                                </svg>
                            {/if}
                            <div class="caption">{$LL.file.download()}</div>
                        </div>
                    {/if}
                    {#if (message.links && message.links.length > 0) || embedLink != undefined}
                        <div
                            class="action reply aspect-square h-8 w-8 bg-contrast/80 rounded-full mr-1 text-center flex justify-center items-center relative cursor-pointer"
                            on:click={() => openCowebsite()}
                            transition:fly={{
                                x: 50,
                                delay: 150,
                                duration: 200,
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="icon icon-tabler icon-tabler-paperclip"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="#ffffff"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path
                                    d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5"
                                />
                            </svg>
                            <div class="caption">{$LL.open()}</div>
                        </div>
                    {/if}
                    <div
                        class="action reply aspect-square h-8 w-8 bg-contrast/80 rounded-full mr-1 text-center flex justify-center items-center relative cursor-pointer"
                        on:click={() => selectMessage(message)}
                        transition:fly={{
                            x: 50,
                            delay: 200,
                            duration: 200,
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-corner-down-right"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M6 6v6a3 3 0 0 0 3 3h10l-4 -4m0 8l4 -4" />
                        </svg>
                        <div class="caption">{$LL.reply()}</div>
                    </div>
                    <div
                        class="action react aspect-square h-8 w-8 bg-contrast/80 rounded-full mr-1 text-center flex justify-center items-center relative cursor-pointer"
                        on:click={() => reactMessage(message)}
                        transition:fly={{
                            x: 50,
                            delay: 250,
                            duration: 200,
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-mood-smile"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                            <path d="M9 10l.01 0" />
                            <path d="M15 10l.01 0" />
                            <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
                        </svg>
                        <div class="caption">{$LL.react()}</div>
                    </div>
                    <div
                        class="action copy aspect-square h-8 w-8 bg-contrast/80 rounded-full mr-1 text-center flex justify-center items-center relative cursor-pointer"
                        on:click={(e) => copyMessage(e, message)}
                        transition:fly={{
                            x: 50,
                            delay: 300,
                            duration: 200,
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-copy"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" />
                            <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
                        </svg>
                        <div class="caption">{$LL.copy()}</div>
                    </div>
                    {#if ($me && $me.isAdmin) || isMe}
                        <div
                            class="action delete aspect-square h-8 w-8 bg-danger rounded-full mr-1 text-center flex justify-center items-center"
                            on:click={() => mucRoom.sendRemoveMessage(message.id)}
                            transition:fly={{
                                x: 50,
                                delay: 350,
                                duration: 200,
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="icon icon-tabler icon-tabler-trash"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="#ffffff"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path d="M4 7l16 0" />
                                <path d="M10 11l0 6" />
                                <path d="M14 11l0 6" />
                                <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                                <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                            </svg>
                            <div class="caption">{$LL.delete()}</div>
                        </div>
                    {/if}
                </div>
            {/if}
            <div
                class="{$deletedMessagesStore.has(message.id) ? '' : 'max-w-2/3'} relative"
                in:fly={{
                    x: isMe ? 10 : -10,
                    delay: 100,
                    duration: 200,
                }}
            >
                <!-- Delete message -->
                {#if !$deletedMessagesStore.has(message.id)}
                    <div class="flex text-xxs px-4 py-1">
                        <span class="bold text-white/50 text-left grow"
                            >{#if isMe}{$LL.me()}{:else}
                                {message.name.match(/\[\d*]/)
                                    ? message.name.substring(0, message.name.search(/\[\d*]/))
                                    : message.name}
                                {#if message.name.match(/\[\d*]/)}
                                    <span class="font-light text-xxs text-gray">
                                        #{message.name
                                            .match(/\[\d*]/)
                                            ?.join()
                                            ?.replace("[", "")
                                            ?.replace("]", "")}
                                    </span>
                                {/if}
                            {/if}</span
                        >
                        <span class="text-white/50 text-right"
                            >{message.time.toLocaleTimeString($locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}</span
                        >
                    </div>
                {/if}
                <!-- Delete message -->
                {#if $deletedMessagesStore.has(message.id)}
                    <div
                        class="wa-message-body break-all rounded-lg px-3 py-1 inline-block leading-6 min-w-[7rem] max-h-80 overflow-hidden relative before:absolute before:content-[''] before:z-10 before:top-64 before:left-0 before:h-16 before:w-full before:bg-gradient-to-t after:content-['Read_more...'] after:absolute after:left-0 after:top-[18.5rem] after:w-full after:h-10 after:cursor-pointer after:text-center after:underline after:z-20 after:text-xs after:mt-6px after:border after:border-l-0 after:border-b-0 after:border-t after:border-solid after:border-white/20 bg-contrast/30"
                    >
                        <p class="italic text-sm opacity-60">
                            {#if JID.toBare(message.jid) === $deletedMessagesStore.get(message.id)}
                                {#if isMe}
                                    {$LL.messageDeletedByYou()}.
                                {:else}
                                    {$LL.messageDeleted()}{message.name}.
                                {/if}
                            {:else}
                                {$LL.messageDeleted()}{$LL.anAdmin()}.
                            {/if}
                        </p>
                    </div>

                    <!-- Message -->
                {:else}
                    <div
                        class="wa-message-body break-all rounded-lg px-4 py-2 inline-block leading-6 min-w-[7rem] max-h-80 overflow-hidden relative before:absolute before:content-[''] before:z-10 before:top-64 before:left-0 before:h-16 before:w-full before:bg-gradient-to-t after:content-['Read_more...'] after:absolute after:left-0 after:top-[18.5rem] after:w-full after:h-10 after:cursor-pointer after:text-center after:underline after:z-20 after:text-xs after:mt-6px after:border after:border-l-0 after:border-b-0 after:border-t after:border-solid after:border-white/20 z-20 group-[.right]:bg-secondary group-[.right]:from-secondary group-[.right]:text-left group-[.right]:before:from-secondary group-[.right]:before:via-secondary group-[.left]:bg-contrast group-[.left]:before:from-contrast group-[.left]:before:via-contrast"
                    >
                        <!-- Body associated -->
                        <div class="text-ellipsis overflow-y-auto whitespace-normal">
                            {#if html}
                                <HtmlMessage {html} {message} />
                            {:else if message.body}
                                <p>{$LL.waiting()}...</p>
                            {/if}
                            {#if urlifyError}
                                <p class="text-red-500">{urlifyError}</p>
                            {/if}
                        </div>

                        <!-- File associated -->
                        {#if message.links && message.links.length > 0}
                            {#each message.links as link (link.url)}
                                <File
                                    on:download={(event) => {
                                        download(event.detail.url, event.detail?.name);
                                    }}
                                    url={link.url}
                                    name={link.description}
                                />
                            {/each}
                        {/if}
                    </div>
                    <!-- React associated -->
                    {#if message.reactions}
                        <Reactions {mucRoom} messageId={message.id} reactions={message.reactions} />
                    {/if}

                    <!-- Reply associated -->
                    {#if message.targetMessageReply}
                        <div
                            class="message-replied text-xs rounded-lg bg-contrast/70 px-3 py-2 text-left cursor-pointer ml-5 relative -translate-y-2"
                            on:click|preventDefault|stopPropagation={() => {
                                scrollToMessage(message.targetMessageReply?.id);
                            }}
                        >
                            <div class="icon-replied absolute -left-4 top-1 opacity-">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="icon icon-tabler icon-tabler-corner-down-right"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="#ffffff"
                                    fill="none"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                    <path d="M6 6v6a3 3 0 0 0 3 3h10l-4 -4m0 8l4 -4" />
                                </svg>
                            </div>
                            <div class="mb-0 text-xxxs whitespace-pre-line break-words opacity-50">
                                {message.targetMessageReply.senderName}
                                {$LL.said()}
                            </div>

                            <!-- Reply message body render -->
                            <div class="mb-0 text-xxs whitespace-pre-line break-words">
                                {@html HtmlUtils.replaceEmoji(message.targetMessageReply.body)}
                            </div>

                            <!-- Reply message file -->
                            {#if message.targetMessageReply.links && message.targetMessageReply.links.length > 0}
                                {#each message.targetMessageReply.links as link (link.url)}
                                    <File url={link.url} name={link.description} />
                                {/each}
                            {/if}
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
        {#if $error}
            <div
                class="wa-error-message"
                on:mouseleave={() => document.getElementById(`error_${message.id}`)?.classList.add("invisible")}
            >
                <div
                    class={`cursor-pointer text-pop-red ml-1 flex ${needHideHeader ? "" : "mt-4"}`}
                    on:click={() => document.getElementById(`error_${message.id}`)?.classList.remove("invisible")}
                >
                    <AlertCircleIcon size="16" />
                </div>
                <div id={`error_${message.id}`} class={`wa-dropdown-menu invisible`}>
                    <span
                        class="wa-dropdown-item"
                        on:click={() =>
                            mucRoom.sendBack(message.id) &&
                            document.getElementById(`error_${message.id}`)?.classList.add("invisible")}
                    >
                        <RefreshCwIcon size="13" class="mr-1" />
                        {$LL.sendBack()}
                    </span>
                    <span
                        class="wa-dropdown-item text-pop-red"
                        on:click={() =>
                            mucRoom.deleteMessage(message.id) &&
                            document.getElementById(`error_${message.id}`)?.classList.add("invisible")}
                    >
                        <Trash2Icon size="13" class="mr-1" />
                        {$LL.delete()}
                    </span>
                </div>
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .wa-error-message {
        position: relative;
        .wa-dropdown-menu {
            right: auto;
            margin-left: -150px;
            margin-top: -42px;
            &::after {
                width: 0;
                height: 0;
                border-top: 6px solid transparent;
                border-bottom: 6px solid transparent;
                border-left: 4px solid #4d4b67;
                content: "";
                position: absolute;
                margin-left: 100%;
                margin-top: calc(20% - 3px);
            }
        }
    }
</style>
