<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { User } from "../Xmpp/AbstractRoom";
    import { defaultColor, defaultWoka, Message } from "../Xmpp/AbstractRoom";
    import LL, { locale } from "../i18n/i18n-svelte";
    import { userStore } from "../Stores/LocalUserStore";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";
    import { UserData } from "../Messages/JsonMessages/ChatData";
    import { onDestroy, onMount } from "svelte";
    import {
        AlertCircleIcon,
        Trash2Icon,
        RefreshCwIcon,
        ArrowDownIcon,
        CornerDownLeftIcon,
        CornerLeftUpIcon,
        SmileIcon,
        MoreHorizontalIcon,
        ArrowUpIcon,
        CopyIcon,
    } from "svelte-feather-icons";
    import { get, Unsubscriber } from "svelte/store";
    import { chatVisibilityStore, selectedMessageToReact, selectedMessageToReply } from "../Stores/ChatStore";
    import { EmojiButton } from "@joeattardi/emoji-button";
    import { HtmlUtils } from "../Utils/HtmlUtils";
    import File from "./Content/File.svelte";
    import HtmlMessage from "./Content/HtmlMessage.svelte";
    import crown from "../../public/static/svg/icone-premium-crown.svg";
    import { iframeListener } from "../IframeListener";
    import { ADMIN_API_URL } from "../Enum/EnvironmentVariable";
    import { ChatState } from "stanza/Constants";
    import { JID } from "stanza";
    import { derived } from "svelte/store";

    export let mucRoom: MucRoom;

    $: unreads = mucRoom.getCountMessagesToSee();
    const messagesStore = mucRoom.getMessagesStore();
    const deletedMessagesStore = mucRoom.getDeletedMessagesStore();
    const presenceStore = mucRoomsStore.getDefaultRoom()?.getPresenceStore() ?? mucRoom.getPresenceStore();
    const usersStore = mucRoom.getPresenceStore();
    const loadingStore = mucRoom.getLoadingStore();
    const canLoadOlderMessagesStore = mucRoom.getCanLoadOlderMessagesStore();
    const showDisabledLoadOlderMessagesStore = mucRoom.getShowDisabledLoadOlderMessagesStore();

    const me = derived(presenceStore, ($presenceStore) => $presenceStore.get(mucRoom.myJID));

    let isScrolledDown = false;
    let messagesList: HTMLElement;
    let picker: EmojiButton;
    let emojiContainer: HTMLElement;

    function needHideHeader(name: string, date: Date, i: number) {
        let previousMsg = [...$messagesStore].sort((a, b) => a.time.getTime() - b.time.getTime())[i - 1];
        if (!previousMsg) {
            return false;
        }
        const minutesBetween = (((date.getTime() - previousMsg.time.getTime()) % 86400000) % 3600000) / 60000;
        return previousMsg.name === name && minutesBetween < 2;
    }

    function showDate(date: Date, i: number) {
        let previousMsg = [...$messagesStore].sort((a, b) => a.time.getTime() - b.time.getTime())[i - 1];
        if (!previousMsg) {
            return true;
        }
        return date.toDateString() !== previousMsg.time.toDateString();
    }

    function isMe(jid: string) {
        return JID.parse(jid).bare === mucRoom.myJIDBare;
    }

    function findUserInDefault(jid: string): User | UserData | undefined {
        if (isMe(jid)) {
            return $userStore;
        }
        const userData = [...$presenceStore].find(([, user]) => user.jid === jid);
        let user = undefined;
        if (userData) {
            [, user] = userData;
        }
        return user;
    }

    function getWoka(jid: string) {
        const user = findUserInDefault(jid);
        if (user) {
            return user.woka;
        } else {
            return defaultWoka;
        }
    }

    function getColor(jid: string) {
        const user = findUserInDefault(jid);
        if (user) {
            return user.color;
        } else {
            return defaultColor;
        }
    }

    export const scrollDown = () => {
        setTimeout(() => messagesList.scroll(0, messagesList.scrollHeight), 10);
    };

    const scrollDownAndRead = () => {
        mucRoom.updateLastMessageSeen();
        scrollDown();
    };

    let subscribers = new Array<Unsubscriber>();
    let lastScrollPosition = 0;

    function scrollEvent() {
        if (messagesList) {
            if (
                messagesList.scrollHeight - messagesList.offsetHeight + 25 >= messagesList.scrollTop &&
                messagesList.scrollTop >= messagesList.scrollHeight - messagesList.offsetHeight - 25
            ) {
                isScrolledDown = true;
                if ($unreads > 0) {
                    mucRoom.updateLastMessageSeen();
                }
            } else {
                isScrolledDown = false;
            }
        }

        if (document.body.scrollTop >= 0 && lastScrollPosition < 0) {
            //Pull to refresh ...
            void mucRoom.sendRetrieveLastMessages();
        }
        lastScrollPosition = document.body.scrollTop;
    }

    function scrollToMessageId(messageId: string) {
        const messageElement = document.getElementById(`message_${messageId}`);
        if (messageElement) {
            messageElement.classList.add("selected");
            setTimeout(() => {
                messageElement.classList.remove("selected");
            }, 500);
            setTimeout(() => {
                messagesList.scroll(
                    0,
                    messageElement.offsetTop - messagesList.clientHeight + messageElement.clientHeight + 10
                );
            }, 0);
        }
    }

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
                    target.innerHTML = originalText.replace(get(LL).copy(), get(LL).copied());
                    setTimeout(() => {
                        target.innerHTML = originalText;
                        target.classList.remove("tw-text-pop-green");
                    }, 2_000);
                }
            })
            .catch((err) => {
                console.error("error copy message => ", err);
            });
    }

    onMount(() => {
        messagesList.addEventListener("scroll", scrollEvent);
        subscribers.push(
            mucRoom.getMessagesStore().subscribe(() => {
                if (isScrolledDown && $chatVisibilityStore) {
                    scrollDownAndRead();
                }
            })
        );

        if ($unreads === 0) {
            isScrolledDown = true;
            scrollDown();
            console.info("First scroll down");
        } else {
            const message = [...$messagesStore].reverse().find((message) => message.time < mucRoom.lastMessageSeen);
            if (message) {
                scrollToMessageId(message.id);
            }
        }
        picker = new EmojiButton({
            styleProperties: {
                "--font": "Press Start 2P",
                "--background-color": "#23222c",
                "--text-color": "#ffffff",
                "--secondary-text-color": "#ffffff",
                "--category-button-color": "#ffffff",
                "--category-button-active-color": "#56eaff",
            },
            emojisPerRow: 5,
            autoFocusSearch: false,
            style: "twemoji",
            showPreview: false,
            i18n: {
                search: $LL.emoji.search(),
                categories: {
                    recents: $LL.emoji.categories.recents(),
                    smileys: $LL.emoji.categories.smileys(),
                    people: $LL.emoji.categories.people(),
                    animals: $LL.emoji.categories.animals(),
                    food: $LL.emoji.categories.food(),
                    activities: $LL.emoji.categories.activities(),
                    travel: $LL.emoji.categories.travel(),
                    objects: $LL.emoji.categories.objects(),
                    symbols: $LL.emoji.categories.symbols(),
                    flags: $LL.emoji.categories.flags(),
                    custom: $LL.emoji.categories.custom(),
                },
                notFound: $LL.emoji.notFound(),
            },
        });

        picker.on("emoji", ({ emoji }) => {
            if (!$selectedMessageToReact) {
                return;
            }
            mucRoom.sendReactionMessage(emoji, $selectedMessageToReact.id);
            selectedMessageToReact.set(null);
        });
        picker.on("hidden", () => {
            selectedMessageToReact.set(null);
        });
    });

    onDestroy(() => {
        messagesList.removeEventListener("scroll", scrollEvent);
        subscribers.forEach((subscriber) => subscriber());
    });
</script>

<div class="wa-messages-list-container" bind:this={messagesList}>
    <div class="emote-menu-container">
        <div class="emote-menu" id="emote-picker" bind:this={emojiContainer} />
    </div>

    <div
        class="wa-messages-list tw-flex tw-flex-col tw-flex-auto tw-px-5 tw-overflow-y-scroll tw-justify-end tw-overflow-y-scroll tw-h-auto tw-min-h-screen tw-pt-14"
    >
        <div class="tw-mb-auto load-history">
            {#if $canLoadOlderMessagesStore}
                {#if !$loadingStore}
                    <button
                        class="tw-m-auto tw-cursor-pointer tw-text-xs"
                        on:click={() => mucRoom.sendRetrieveLastMessages()}
                        >{$LL.load()}
                        {$LL.more()}
                        <ArrowUpIcon size="13" class="tw-ml-1" /></button
                    >
                {:else}
                    <div
                        style="border-top-color:transparent"
                        class="tw-w-5 tw-h-5 tw-border-2 tw-border-white tw-border-solid tw-rounded-full tw-animate-spin tw-m-auto"
                    />
                {/if}
            {:else if $showDisabledLoadOlderMessagesStore && $me && $me.isAdmin}
                {#if ADMIN_API_URL}
                    <button
                        class="tw-text-orange tw-font-bold tw-underline tw-m-auto tw-text-xs tw-cursor-pointer"
                        on:click={() => iframeListener.sendRedirectPricing()}
                    >
                        <img alt="Crown icon" src={crown} class="tw-mr-1" />
                        {$LL.upgradeToSeeMore()}
                    </button>
                {/if}
            {/if}
        </div>
        {#each [...$messagesStore].sort((a, b) => a.time.getTime() - b.time.getTime()) as message, i}
            {#if showDate(message.time, i)}
                <div class="wa-separator">
                    {message.time.toLocaleDateString($locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}
                </div>
            {/if}
            <div
                id={`message_${message.id}`}
                class={`wa-message tw-flex ${isMe(message.jid) ? "tw-justify-end" : "tw-justify-start"}
            ${needHideHeader(message.name, message.time, i) ? "tw-mt-0.5" : "tw-mt-2"}
            ${isMe(message.jid) ? (message.delivered ? "sent" : "sending") : "received"}
            `}
            >
                <div class="tw-flex tw-flex-row tw-items-center  tw-max-w-full">
                    <div
                        class={`tw-flex tw-flex-wrap tw-max-w-full ${
                            isMe(message.jid) ? "tw-justify-end" : "tw-justify-start"
                        }`}
                    >
                        <div
                            class={`${
                                isMe(message.jid) || needHideHeader(message.name, message.time, i)
                                    ? "tw-opacity-0"
                                    : "tw-mt-4"
                            } tw-relative wa-avatar-mini tw-mr-2`}
                            transition:fade={{ duration: 100 }}
                            style={`background-color: ${getColor(message.jid)}`}
                        >
                            <div class="wa-container">
                                <img
                                    class="tw-w-full"
                                    style="image-rendering: pixelated;"
                                    src={getWoka(message.jid)}
                                    alt="Avatar"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                        <div
                            style="max-width: 75%"
                            transition:fly={{
                                x: isMe(message.jid) ? 10 : -10,
                                delay: 100,
                                duration: 200,
                            }}
                        >
                            <div
                                style={`border-bottom-color:${getColor(message.jid)}`}
                                class={`tw-flex tw-items-end tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xxs tw-pb-0.5 ${
                                    !message.targetMessageReply && needHideHeader(message.name, message.time, i)
                                        ? "tw-hidden"
                                        : ""
                                } ${isMe(message.jid) ? "tw-flex-row-reverse" : "tw-flex-row"}`}
                            >
                                <span class={`tw-text-lighter-purple ${isMe(message.jid) ? "tw-ml-2" : "tw-mr-2"}`}
                                    >{#if isMe(message.jid)}{$LL.me()}{:else}
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
                            {#if [...$deletedMessagesStore].find((deleted) => deleted === message.id)}
                                <div class="wa-message-body">
                                    <p class="tw-italic">
                                        {$LL.messageDeleted()}
                                        {#if isMe(message.jid)}
                                            {$LL.me()}.
                                        {:else}
                                            {message.name}.
                                        {/if}
                                    </p>
                                </div>

                                <!-- Message -->
                            {:else}
                                <div class="wa-message-body">
                                    <!-- Body associated -->
                                    <div class="tw-text-ellipsis tw-overflow-y-auto tw-whitespace-normal">
                                        {#await HtmlUtils.urlify(message.body)}
                                            <p>...waiting</p>
                                        {:then html}
                                            <HtmlMessage {html} {message} />
                                        {/await}
                                    </div>

                                    <!-- File associated -->
                                    {#if message.links && message.links.length > 0}
                                        {#each message.links as link}
                                            <File url={link.url} name={link.description} />
                                        {/each}
                                    {/if}

                                    {#if !message.error}
                                        <!-- Action bar -->
                                        <div
                                            class="actions tw-rounded-lg tw-bg-dark tw-text-xs tw-px-3 tw-py-2 tw-text-left"
                                        >
                                            <div class="action reply" on:click={() => selectMessage(message)}>
                                                <CornerDownLeftIcon size="17" />
                                            </div>
                                            <div class="action react" on:click={() => reactMessage(message)}>
                                                <SmileIcon size="17" />
                                            </div>
                                            <div class="action more-option">
                                                <MoreHorizontalIcon size="17" />

                                                <div class="wa-dropdown-menu tw-invisible">
                                                    <span
                                                        class="wa-dropdown-item"
                                                        on:click={() => selectMessage(message)}
                                                    >
                                                        <CornerDownLeftIcon size="13" class="tw-mr-1" />
                                                        {$LL.reply()}
                                                    </span>
                                                    <span
                                                        class="wa-dropdown-item"
                                                        on:click={() => reactMessage(message)}
                                                    >
                                                        <SmileIcon size="13" class="tw-mr-1" />
                                                        {$LL.react()}
                                                    </span>
                                                    <span
                                                        class="wa-dropdown-item"
                                                        on:click={(e) => copyMessage(e, message)}
                                                    >
                                                        <CopyIcon size="13" class="tw-mr-1" />
                                                        {$LL.copy()}
                                                    </span>
                                                    {#if ($me && $me.isAdmin) || isMe(message.jid)}
                                                        <span
                                                            class="wa-dropdown-item tw-text-pop-red"
                                                            on:click={() => mucRoom.sendRemoveMessage(message.id)}
                                                        >
                                                            <Trash2Icon size="13" class="tw-mr-1" />
                                                            {$LL.delete()}
                                                        </span>
                                                    {/if}
                                                </div>
                                            </div>
                                        </div>
                                    {/if}
                                </div>

                                <!-- React associated -->
                                {#if message.reactionsMessage}
                                    <div class="emojis">
                                        {#each [...message.reactionsMessage] as [emojiStr, usersJid]}
                                            <span
                                                class={mucRoom.haveReaction(emojiStr, message.id) ? "active" : ""}
                                                on:click={() => mucRoom.sendReactionMessage(emojiStr, message.id)}
                                                title={`${usersJid
                                                    .map((userJid) => JID.parse(userJid).resource)
                                                    .join("\r\n")}`}
                                            >
                                                {emojiStr}
                                                {usersJid.length}
                                            </span>
                                        {/each}
                                    </div>
                                {/if}
                                <!--
                                {#if message.targetMessageReact}
                                    <div class="emojis">
                                        {#each [...message.targetMessageReact.keys()] as emojiStr}
                                            {#if message.targetMessageReact.get(emojiStr)}
                                                <span
                                                    class={mucRoom.haveReaction(emojiStr, message.id) ? "active" : ""}
                                                    on:click={() => mucRoom.sendReactionMessage(emojiStr, message.id)}
                                                >
                                                    {emojiStr}
                                                    {#if message.targetMessageReact.get(emojiStr) ?? 0 > 1}
                                                        {message.targetMessageReact.get(emojiStr)}
                                                    {/if}
                                                </span>
                                            {/if}
                                        {/each}
                                    </div>
                                {/if}
                                -->

                                <!-- Reply associated -->
                                {#if message.targetMessageReply}
                                    <div
                                        class="message-replied tw-text-xs tw-rounded-lg tw-bg-dark tw-px-3 tw-py-2 tw-mt-3 tw-mb-2 tw-text-left tw-cursor-pointer"
                                        on:click={() => scrollToMessageId(message.targetMessageReply?.id ?? "")}
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
                                            {@html HtmlUtils.replaceEmojy(message.targetMessageReply.body)}
                                        </p>

                                        <!-- Reply message file -->
                                        {#if message.targetMessageReply.links && message.targetMessageReply.links.length > 0}
                                            {#each message.targetMessageReply.links as link}
                                                <File url={link.url} name={link.description} />
                                            {/each}
                                        {/if}
                                    </div>
                                {/if}
                            {/if}
                        </div>
                    </div>
                    {#if message.error}
                        <div
                            class="wa-error-message"
                            on:mouseleave={() =>
                                document.getElementById(`error_${message.id}`)?.classList.add("tw-invisible")}
                        >
                            <div
                                class={`tw-cursor-pointer tw-text-pop-red tw-ml-1 tw-flex ${
                                    needHideHeader(message.name, message.time, i) ? "" : "tw-mt-4"
                                }`}
                                on:click={() =>
                                    document.getElementById(`error_${message.id}`)?.classList.remove("tw-invisible")}
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
        {/each}
        {#each [...$usersStore].filter(([, userFilter]) => !userFilter.isMe && userFilter.chatState === ChatState.Composing) as [nb, user]}
            <div class={`tw-mt-2`} id={`user-line-${nb}`}>
                <div class={`tw-flex tw-justify-start`}>
                    <div
                        class={`tw-mt-4 tw-relative wa-avatar-mini tw-mr-2 tw-z-10`}
                        style={`background-color: ${getColor(user.jid)}`}
                        in:fade={{ duration: 100 }}
                        out:fade={{ delay: 200, duration: 100 }}
                    >
                        <div class="wa-container">
                            <img class="tw-w-full" src={getWoka(user.jid)} alt="Avatar" />
                        </div>
                    </div>
                    <div
                        class={`tw-w-3/4`}
                        in:fly={{ x: -10, delay: 100, duration: 200 }}
                        out:fly={{ x: -10, duration: 200 }}
                    >
                        <div class="tw-w-fit">
                            <div
                                style={`border-bottom-color:${getColor(user.jid)}`}
                                class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-pb-1`}
                            >
                                <span class="tw-text-lighter-purple tw-text-xxs">
                                    {user.name}
                                </span>
                            </div>
                            <div class="tw-rounded-lg tw-bg-dark tw-text-xs tw-p-3">
                                <!-- loading animation -->
                                <div class="loading-group">
                                    <span class="loading-dot" />
                                    <span class="loading-dot" />
                                    <span class="loading-dot" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/each}
        {#if $unreads > 0}
            <div class="tw-w-full tw-fixed tw-left-0 tw-bottom-14 tw-animate-bounce tw-cursor-pointer">
                <div
                    transition:fly={{ y: 10, duration: 200 }}
                    style="margin: auto"
                    class="tw-bg-lighter-purple tw-rounded-xl tw-h-5 tw-px-2 tw-w-fit tw-text-xs tw-flex tw-justify-center tw-items-center tw-shadow-grey"
                    role="button"
                    on:click={scrollDownAndRead}
                >
                    <ArrowDownIcon size="14" />
                    <p class="tw-m-0">
                        {$unreads}
                        {$unreads > 1 ? "nouveaux messages" : "nouveau message"}
                    </p>
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
        word-break: break-all;
        .actions {
            display: none;
            position: absolute;
            right: -16px;
            top: calc(50% - 34px);
            padding: 0px;
            cursor: pointer;
            flex-direction: column;
            border-radius: 0.25rem;
            border-width: 1px;
            border-style: solid;
            --tw-border-opacity: 1;
            border-color: rgb(77 75 103 / var(--tw-border-opacity));
            background-color: rgb(27 27 41 / 0.95);
            font-size: 0.75rem;
            line-height: 1rem;
            font-weight: 500;
            color: rgb(255 255 255 / var(--tw-text-opacity));
            --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color);
            box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
            z-index: 1;
            transition: all 0.2s ease-out;

            div.action {
                padding: 2px;
                border-radius: 0.15rem;
                &:hover {
                    --tw-bg-opacity: 1;
                    background-color: rgb(77 75 103 / var(--tw-bg-opacity));
                }
            }
        }
        &:hover {
            background-color: rgba(15, 31, 45, 1);
            .actions {
                display: flex;
            }
        }
        .more-option {
            position: relative;
            .wa-dropdown-menu {
                right: -2px;
            }
            &:hover {
                .wa-dropdown-menu {
                    visibility: visible;
                }
            }
        }
    }
    .emojis {
        display: flex;
        flex-wrap: wrap;
        margin-top: -8px;
        position: relative;
        flex-direction: row-reverse;
        margin-right: -5px;
        span {
            font-size: 0.65rem;
            border-radius: 1.5rem;
            line-height: 0.75rem;
            display: block;
            background-color: #c3c3c345;
            border: solid 1px #c3c3c3;
            &.active {
                background-color: #56eaff4f;
                border: solid 1px #56eaff;
            }
            cursor: pointer;
            padding: 2px 3px;
            margin: 0.5px;
        }
    }
</style>
