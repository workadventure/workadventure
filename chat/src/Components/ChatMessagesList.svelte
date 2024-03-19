<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { UserData } from "@workadventure/messages";
    import { onDestroy, onMount } from "svelte";
    import { ArrowUpIcon } from "svelte-feather-icons";
    import { get, Unsubscriber } from "svelte/store";
    import { EmojiButton } from "@joeattardi/emoji-button";
    import { ChatState } from "stanza/Constants";
    import { JID } from "stanza";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { User, defaultColor, defaultWoka } from "../Xmpp/AbstractRoom";
    import { LL, locale } from "../i18n/i18n-svelte";
    import { userStore } from "../Stores/LocalUserStore";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";
    import { chatVisibilityStore, selectedMessageToReact } from "../Stores/ChatStore";
    import crown from "../../public/static/svg/icone-premium-crown.svg";
    import { iframeListener } from "../IframeListener";
    import { ADMIN_API_URL } from "../Enum/EnvironmentVariable";
    import Message from "./Content/Message.svelte";

    export let mucRoom: MucRoom;
    export let formHeight: number;

    const unreads = mucRoom.getCountMessagesToSee();
    const messagesStore = mucRoom.getMessagesStore();
    const presenceStore = mucRoomsStore.getDefaultRoom()?.getPresenceStore() ?? mucRoom.getPresenceStore();
    const usersStore = mucRoom.getPresenceStore();
    const loadingStore = mucRoom.getLoadingStore();
    const canLoadOlderMessagesStore = mucRoom.getCanLoadOlderMessagesStore();
    const showDisabledLoadOlderMessagesStore = mucRoom.getShowDisabledLoadOlderMessagesStore();

    const me = presenceStore.get(mucRoom.myJID);

    let isScrolledDown = false;
    let messagesList: HTMLElement;
    let picker: EmojiButton;
    let emojiContainer: HTMLElement;

    function needHideHeader(name: string, date: Date, i: number) {
        let previousMsg = $messagesStore.sort((a, b) => a.time.getTime() - b.time.getTime())[i - 1];
        if (!previousMsg) {
            return false;
        }
        const minutesBetween = (((date.getTime() - previousMsg.time.getTime()) % 86400000) % 3600000) / 60000;
        return previousMsg.name === name && minutesBetween < 2;
    }

    function showDate(date: Date, i: number) {
        let previousMsg = $messagesStore.sort((a, b) => a.time.getTime() - b.time.getTime())[i - 1];
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
        const userData = $presenceStore.find((user) => get(user).jid === jid);
        if (!userData) {
            $presenceStore.find((user) => JID.toBare(get(user).jid) === JID.toBare(jid));
        }
        let user = undefined;
        if (userData) {
            user = get(userData);
        }
        return user;
    }

    function getWoka(jid: string): string {
        const user = findUserInDefault(jid);
        if (user) {
            return user.woka ?? defaultWoka;
        } else {
            return defaultWoka;
        }
    }

    function getColor(jid: string): string {
        const user = findUserInDefault(jid);
        if (user) {
            return user.color ?? defaultColor;
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
            if (messagesList.scrollTop + messagesList.offsetHeight >= messagesList.scrollHeight) {
                isScrolledDown = true;
                if ($unreads > 0) {
                    mucRoom.updateLastMessageSeen();
                }
            } else if (messagesList.scrollTop <= 15 && $canLoadOlderMessagesStore && !$loadingStore) {
                void mucRoom.sendRetrieveLastMessages();
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

    export const scrollToMessageId = (messageId: string) => {
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
    };

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
        } else {
            const message = [...$messagesStore.values()]
                .reverse()
                .find((message) => message.time < mucRoom.lastMessageSeen);
            if (message) {
                scrollToMessageId(message.id);
            }
        }
        picker = new EmojiButton({
            styleProperties: {
                "--font": "Roboto Condensed",
                "--background-color": "rgb(42, 66, 101)",
                "--text-color": "#00FF00",
                "--secondary-text-color": "#00FF00",
                "--category-button-color": "#00FF00",
                "--category-button-active-color": "rgb(65, 86, 246)",
            },
            position: "bottom-start",
            emojisPerRow: 5,
            autoFocusSearch: false,
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

<div
    class="wa-messages-list-container"
    bind:this={messagesList}
    style={`max-height: calc( 100vh - 6rem - ${formHeight - 7}px );`}
>
    <div
        class="wa-messages-list flex flex-col flex-auto px-5 pt-24 pb-16 justify-end h-auto min-h-screen relative z-10 overflow-x-hidden"
    >
        <div class="mb-auto load-history flex items-center pb-2">
            {#if $canLoadOlderMessagesStore}
                {#if !$loadingStore}
                    <button
                        class="m-auto cursor-pointer text-xs rounded-xl btn btn-border btn-light btn-xs !px-3"
                        on:click={() => mucRoom.sendRetrieveLastMessages()}
                        >{$LL.load()}
                        {$LL.more()}
                        <ArrowUpIcon size="13" class="ml-1" /></button
                    >
                {:else}
                    <div
                        style="border-top-color:transparent"
                        class="w-5 h-5 border-2 border-white border-solid rounded-full animate-spin m-auto"
                    />
                {/if}
            {:else if $showDisabledLoadOlderMessagesStore && $me && $me.isAdmin}
                {#if ADMIN_API_URL}
                    <button
                        class="text-warning font-bold underline m-auto text-xs cursor-pointer"
                        on:click={() => iframeListener.sendRedirectPricing()}
                    >
                        <img alt="Crown icon" src={crown} class="mr-1" />
                        {$LL.upgradeToSeeMore()}
                    </button>
                {/if}
            {/if}
        </div>
        {#each $messagesStore as message, i (message.id)}
            {#if showDate(message.time, i)}
                <div class="wa-separator text-xs text-center w-full opacity-50">
                    {message.time.toLocaleDateString($locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}
                </div>
            {/if}
            <Message
                {mucRoom}
                {message}
                {picker}
                {emojiContainer}
                {me}
                isMe={isMe(message.jid)}
                color={getColor(message.jid)}
                woka={getWoka(message.jid)}
                needHideHeader={needHideHeader(message.name, message.time, i)}
            />
            <div class="emote-menu-container">
                <div class="emote-menu" id="emote-picker" bind:this={emojiContainer} />
            </div>
        {/each}
        {#each $usersStore
            .filter((userFilter) => !get(userFilter).isMe && get(userFilter).chatState === ChatState.Composing)
            .map((user) => get(user)) as user (user.jid)}
            <div class={`mt-2`}>
                <div class={`flex justify-start`}>
                    <div
                        class={`mt-4 relative wa-avatar-mini mr-2 z-10`}
                        style={`background-color: ${getColor(user.jid)}`}
                        in:fade={{ duration: 100 }}
                    >
                        <div class="wa-container">
                            <img class="w-full" src={getWoka(user.jid)} alt="Avatar" />
                        </div>
                    </div>
                    <div class={`w-3/4`} in:fly={{ x: -10, delay: 100, duration: 200 }}>
                        <div class="w-fit">
                            <div
                                style={`border-bottom-color:${getColor(user.jid)}`}
                                class={`flex justify-between mx-2 border-0 border-b border-solid text-light-purple-alt pb-1`}
                            >
                                <span class="text-lighter-purple text-xxs">
                                    {user.name}
                                </span>
                            </div>
                            <div class="rounded-lg bg-dark text-xs p-3">
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
            <div class="w-full fixed left-0 bottom-16 animate-bounce cursor-pointer">
                <div
                    in:fly={{ y: 10, duration: 200 }}
                    style="margin: auto"
                    class="bg-secondary rounded-xl px-3 py-1 w-fit text-xs flex justify-center items-center shadow-grey"
                    role="button"
                    tabindex="0"
                    on:click={scrollDownAndRead}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler icon-tabler-chevrons-down"
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
                        <path d="M7 7l5 5l5 -5" />
                        <path d="M7 13l5 5l5 -5" />
                    </svg>
                    <div class="ml-1">
                        {$unreads}
                        {$unreads > 1 ? "nouveaux messages" : "nouveau message"}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
