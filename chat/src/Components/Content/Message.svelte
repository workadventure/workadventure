<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import {
        AlertCircleIcon,
        CopyIcon,
        CornerDownLeftIcon,
        CornerLeftUpIcon,
        EyeIcon,
        RefreshCwIcon,
        SmileIcon,
        Trash2Icon,
        DownloadCloudIcon,
        LoaderIcon,
    } from "svelte-feather-icons";
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
                    target.classList.add("tw-text-pop-green");
                    const originalText = target.innerHTML;
                    target.innerHTML = originalText.replace($LL.copy(), $LL.copied());
                    setTimeout(() => {
                        target.innerHTML = originalText;
                        target.classList.remove("tw-text-pop-green");
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
    class={`wa-message tw-flex ${isMe ? "tw-justify-end" : "tw-justify-start"}
            ${needHideHeader ? "tw-mt-0.5" : "tw-mt-2"}
            ${isMe ? ($delivered ? "sent" : "sending") : "received"}
            `}
>
    <div class="tw-flex tw-flex-row tw-items-center  tw-max-w-full">
        <div class={`tw-flex tw-max-w-full tw-items-center ${isMe ? "tw-justify-end" : "tw-justify-start"}`}>
            {#if !isMe}
                <div
                    class={`${
                        isMe || needHideHeader ? "tw-opacity-0" : "tw-mt-4"
                    } tw-relative wa-avatar-mini tw-mr-2 tw-self-start`}
                    in:fade={{ duration: 100 }}
                    style={`background-color: ${color}`}
                >
                    <div class="wa-container">
                        <img
                            class="tw-w-full"
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
                    class={`actions tw-rounded-lg tw-text-xs tw-text-left tw-flex ${needHideHeader ? "" : "tw-pt-4"} ${
                        isMe ? "tw-pr-2 tw-flex-row-reverse" : "tw-order-3 tw-pl-2 tw-flex-row"
                    }`}
                    style={($me && $me.isAdmin) || isMe ? "width: 92px;" : "width: 72px;"}
                >
                    {#if message.links != undefined && message.links.length > 0}
                        <div class="action reply" on:click={() => downloadAllFile()}>
                            {#if loadingDownload}
                                <LoaderIcon size="17" />
                            {:else}
                                <DownloadCloudIcon size="17" />
                            {/if}
                            <div class="caption">{$LL.file.download()}</div>
                        </div>
                    {/if}
                    {#if (message.links && message.links.length > 0) || embedLink != undefined}
                        <div class="action reply" on:click={() => openCowebsite()}>
                            <EyeIcon size="17" />
                            <div class="caption">{$LL.open()}</div>
                        </div>
                    {/if}
                    <div class="action reply" on:click={() => selectMessage(message)}>
                        <CornerDownLeftIcon size="17" />
                        <div class="caption">{$LL.reply()}</div>
                    </div>
                    <div class="action react" on:click={() => reactMessage(message)}>
                        <SmileIcon size="17" />
                        <div class="caption">{$LL.react()}</div>
                    </div>
                    <div class="action copy" on:click={(e) => copyMessage(e, message)}>
                        <CopyIcon size="17" />
                        <div class="caption">{$LL.copy()}</div>
                    </div>
                    {#if ($me && $me.isAdmin) || isMe}
                        <div
                            class="action delete tw-text-pop-red"
                            on:click={() => mucRoom.sendRemoveMessage(message.id)}
                        >
                            <Trash2Icon size="17" />
                            <div class="caption">{$LL.delete()}</div>
                        </div>
                    {/if}
                </div>
            {/if}
            <div
                style={`${$deletedMessagesStore.has(message.id) ? "" : "max-width: 62%;"}`}
                in:fly={{
                    x: isMe ? 10 : -10,
                    delay: 100,
                    duration: 200,
                }}
            >
                <div
                    style={`border-bottom-color:${color}`}
                    class={`tw-flex tw-items-end tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xxs tw-pb-0.5 ${
                        !message.targetMessageReply && needHideHeader ? "tw-hidden" : ""
                    } ${isMe ? "tw-flex-row-reverse" : "tw-flex-row"}`}
                >
                    <span class={`tw-text-lighter-purple ${isMe ? "tw-ml-2" : "tw-mr-2"}`}
                        >{#if isMe}{$LL.me()}{:else}
                            {message.name.match(/\[\d*]/)
                                ? message.name.substring(0, message.name.search(/\[\d*]/))
                                : message.name}
                            {#if message.name.match(/\[\d*]/)}
                                <span class="tw-font-light tw-text-xxs tw-text-gray">
                                    #{message.name
                                        .match(/\[\d*]/)
                                        ?.join()
                                        ?.replace("[", "")
                                        ?.replace("]", "")}
                                </span>
                            {/if}
                        {/if}</span
                    >
                    <span class="tw-text-xxxs"
                        >{message.time.toLocaleTimeString($locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}</span
                    >
                </div>

                <!-- Delete message -->
                {#if $deletedMessagesStore.has(message.id)}
                    <div class="wa-message-body">
                        <p class="tw-italic">
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
                    <div class="wa-message-body">
                        <!-- Body associated -->
                        <div class="tw-text-ellipsis tw-overflow-y-auto tw-whitespace-normal">
                            {#if html}
                                <HtmlMessage {html} {message} />
                            {:else if message.body}
                                <p>{$LL.waiting()}...</p>
                            {/if}
                            {#if urlifyError}
                                <p class="tw-text-red-500">{urlifyError}</p>
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
                            class="message-replied tw-text-xs tw-rounded-lg tw-bg-dark tw-px-3 tw-py-2 tw-mt-1 tw-mb-2 tw-text-left tw-cursor-pointer"
                            on:click|preventDefault|stopPropagation={() => {
                                scrollToMessage(message.targetMessageReply?.id);
                            }}
                        >
                            <div class="icon-replied">
                                <CornerLeftUpIcon size="14" />
                            </div>
                            <p class="tw-mb-0 tw-text-xxxs tw-whitespace-pre-line tw-break-words">
                                {message.targetMessageReply.senderName}
                                {$LL.said()}
                            </p>

                            <!-- Reply message body render -->
                            <p class="tw-mb-0 tw-text-xxs tw-whitespace-pre-line tw-break-words">
                                {@html HtmlUtils.replaceEmoji(message.targetMessageReply.body)}
                            </p>

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
                on:mouseleave={() => document.getElementById(`error_${message.id}`)?.classList.add("tw-invisible")}
            >
                <div
                    class={`tw-cursor-pointer tw-text-pop-red tw-ml-1 tw-flex ${needHideHeader ? "" : "tw-mt-4"}`}
                    on:click={() => document.getElementById(`error_${message.id}`)?.classList.remove("tw-invisible")}
                >
                    <AlertCircleIcon size="16" />
                </div>
                <div id={`error_${message.id}`} class={`wa-dropdown-menu tw-invisible`}>
                    <span
                        class="wa-dropdown-item"
                        on:click={() =>
                            mucRoom.sendBack(message.id) &&
                            document.getElementById(`error_${message.id}`)?.classList.add("tw-invisible")}
                    >
                        <RefreshCwIcon size="13" class="tw-mr-1" />
                        {$LL.sendBack()}
                    </span>
                    <span
                        class="wa-dropdown-item tw-text-pop-red"
                        on:click={() =>
                            mucRoom.deleteMessage(message.id) &&
                            document.getElementById(`error_${message.id}`)?.classList.add("tw-invisible")}
                    >
                        <Trash2Icon size="13" class="tw-mr-1" />
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

    .message-replied {
        opacity: 0.6;
        margin-left: 20px;
        position: relative;
        margin-bottom: 0;
        .icon-replied {
            position: absolute;
            left: -15px;
            top: 0px;
        }

        p:nth-child(1) {
            font-style: italic;
        }
    }
    p {
        margin-bottom: 0 !important;
    }
    .selected .message::after {
        border-radius: 0.5rem;
        padding: 0.5rem 0.75rem;
        content: " ";
        width: 100%;
        height: 100%;
        display: block;
        position: absolute;
        top: 0;
        right: 0;
        border: solid 0.5px white;
    }
    .wa-message-body {
        position: relative;
        min-width: 75px;
        word-break: break-word;
    }
</style>
