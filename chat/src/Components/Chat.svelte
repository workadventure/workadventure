<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber, derived } from "svelte/store";
    import { HtmlUtils } from "../Utils/HtmlUtils";
    import { mucRoomsStore, xmppServerConnectionStatusStore } from "../Stores/MucRoomsStore";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { userStore } from "../Stores/LocalUserStore";
    import { LL, locale } from "../i18n/i18n-svelte";
    import { localeDetector } from "../i18n/locales";
    import { activeThreadStore } from "../Stores/ActiveThreadStore";
    import {
        availabilityStatusStore,
        connectionEstablishedStore,
        connectionNotAuthorizedStore,
        enableChat,
        enableChatOnlineListStore,
        navChat,
        showForumsStore,
        showChatZonesStore,
        showTimelineStore,
        timelineActiveStore,
        timelineMessagesToSee,
    } from "../Stores/ChatStore";
    import { ENABLE_OPENID } from "../Enum/EnvironmentVariable";
    import { iframeListener } from "../IframeListener";
    import ChatZones from "./ChatZones.svelte";
    import ChatActiveThread from "./ChatActiveThread.svelte";
    import ChatActiveThreadTimeLine from "./Timeline/ChatActiveThreadTimeline.svelte";
    import Timeline from "./Timeline/Timeline.svelte";
    import UsersList from "./UsersList.svelte";
    import Loader from "./Loader.svelte";
    import NeedRefresh from "./NeedRefresh.svelte";
    import Forums from "./Forums.svelte";

    let chatWindowElement: HTMLElement;
    let handleFormBlur: { blur(): void };

    let searchValue = "";

    let defaultMucRoom: MucRoom | undefined = undefined;
    let subscribeListeners = new Array<Unsubscriber>();
    let subscribeTotalMessagesToSee: Unsubscriber;

    const loading = derived(
        [connectionEstablishedStore, xmppServerConnectionStatusStore],
        ([$connectionEstablishedStore, $xmppServerConnectionStatusStore]) =>
            !$connectionEstablishedStore || !$xmppServerConnectionStatusStore
    );

    let totalMessagesToSee = derived(
        [...[...$mucRoomsStore].map((mucRoom) => mucRoom.getCountMessagesToSee()), timelineMessagesToSee],
        ($totalMessagesToSee) => $totalMessagesToSee.reduce((sum, number) => sum + number, 0)
    );

    let showPart = derived(
        [connectionNotAuthorizedStore, timelineActiveStore, activeThreadStore, loading],
        ([$connectionNotAuthorizedStore, $timelineActiveStore, $activeThreadStore, $loading]) => {
            if ($timelineActiveStore) {
                return "activeTimeline";
            } else if ($connectionNotAuthorizedStore) {
                return "connectionNotAuthorized";
            } else if ($loading) {
                return "loading";
            } else if ($activeThreadStore) {
                return "activeThread";
            }
            return "home";
        }
    );

    onMount(async () => {
        if (!$locale) {
            await localeDetector();
        }
        iframeListener.sendChatIsReady();
        subscribeTotalMessagesToSee = totalMessagesToSee.subscribe((total: number) => {
            iframeListener.sendChatTotalMessagesToSee(total);
        });
        subscribeListeners.push(
            mucRoomsStore.subscribe((mucRooms) => {
                subscribeTotalMessagesToSee();
                totalMessagesToSee = derived(
                    [...mucRooms].map((mucRoom) => mucRoom.getCountMessagesToSee()),
                    ($totalMessagesToSee) => $totalMessagesToSee.reduce((sum, number) => sum + number, 0)
                );
                subscribeTotalMessagesToSee = totalMessagesToSee.subscribe((total: number) =>
                    iframeListener.sendChatTotalMessagesToSee(total)
                );

                defaultMucRoom = mucRoomsStore.getDefaultRoom();
            })
        );
        subscribeListeners.push(
            availabilityStatusStore.subscribe(() => {
                mucRoomsStore.sendUserInfos();
            })
        );
        subscribeListeners.push(
            showChatZonesStore.subscribe((value) => {
                if (value) {
                    showForumsStore.set(false);
                    showTimelineStore.set(false);
                }
            })
        );
        subscribeListeners.push(
            showForumsStore.subscribe((value) => {
                if (value) {
                    showChatZonesStore.set(false);
                    showTimelineStore.set(false);
                }
            })
        );
        subscribeListeners.push(
            showTimelineStore.subscribe((value) => {
                if (value) {
                    showChatZonesStore.set(false);
                    showForumsStore.set(false);
                }
            })
        );
    });

    onDestroy(() => {
        subscribeListeners.forEach((listener) => {
            listener();
        });
        subscribeTotalMessagesToSee();
    });

    function onClick(event: MouseEvent) {
        if (handleFormBlur && HtmlUtils.isClickedOutside(event, chatWindowElement)) {
            handleFormBlur.blur();
        }
    }

    function closeChat() {
        window.parent.postMessage({ type: "closeChat" }, "*");
        //document.activeElement?.blur();
    }
    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeChat();
        }
    }

    function login() {
        if (window.location !== window.parent?.location) {
            iframeListener.sendLogin();
        }
    }

    $: loadingText = $userStore
        ? !$connectionEstablishedStore
            ? $LL.connecting()
            : $LL.waitingInit()
        : $LL.waitingData();

    console.info("Chat fully loaded");
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />

<aside
    class="chatWindow h-full text-white relative after:content-[''] after:absolute after:w-[1px] after:h-full after:right-0 after:top-0 after:bg-white/30 after:z-50"
    bind:this={chatWindowElement}
>
    <section class="p-0 m-0 h-full">
        {#if $showPart === "activeTimeline"}
            <ChatActiveThreadTimeLine on:unactiveThreadTimeLine={() => timelineActiveStore.set(false)} />
        {:else if $showPart === "activeThread" && !["connectionNotAuthorized", "loading"].includes($showPart)}
            {#if $activeThreadStore !== undefined}
                <ChatActiveThread activeThread={$activeThreadStore} />
            {/if}
        {:else if ["home", "connectionNotAuthorized", "loading"].includes($showPart)}
            <div class="flex flex-col items-stretch h-screen {ENABLE_OPENID && $enableChat ? '' : ''}">
                {#if $showPart === "connectionNotAuthorized"}
                    <NeedRefresh />
                {:else if $showPart === "loading"}
                    <Loader text={loadingText} className="h-full bg-contrast/80" />
                {:else}
                    {#if $enableChatOnlineListStore}
                        <nav class="nav">
                            <div class:chat={$navChat === "chat"} />
                            <ul class="list-none flex justify-between">
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <li
                                    class="w-1/2 py-4 text-center cursor-pointer bold border border-solid border-secondary border-x-0 border-b-0 {$navChat ===
                                    'chat'
                                        ? 'bg-contrast/80 text-white border-t-2'
                                        : 'border-t-0'}"
                                    on:click={() => navChat.set("chat")}
                                >
                                    Chat
                                </li>
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <li
                                    class="w-1/2 py-4 text-center cursor-pointer bold border border-solid border-secondary border-x-0 border-b-0 {$navChat ===
                                    'users'
                                        ? 'bg-contrast/80 text-white border-t-2'
                                        : 'border-t-0'}"
                                    on:click={() => navChat.set("users")}
                                >
                                    {$LL.users()}
                                </li>
                            </ul>
                        </nav>
                        <!-- searchbar -->
                        <div class="bg-contrast/80">
                            <div class="p-3 relative">
                                <input
                                    class="wa-searchbar block text-white w-full placeholder:text-sm rounded-full pr-4 py-3 pl-12 border-light-purple border border-solid hover:bg-contrast/80 transition-all focus:placeholder:text-white focus:bg-contrast focus:pl-14 focus:outline-secondary bg-transparent peer"
                                    placeholder={$navChat === "users" ? $LL.searchUser() : $LL.searchChat()}
                                    bind:value={searchValue}
                                    autofocus
                                />
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    class="absolute left-8 top-0 bottom-0 m-auto peer-focus:opacity-100 opacity-50 transition-all peer-focus:translate-x-1"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <g>
                                        <path
                                            d="M14 14L10 10M2 6.66667C2 7.2795 2.12071 7.88634 2.35523 8.45252C2.58975 9.01871 2.9335 9.53316 3.36684 9.9665C3.80018 10.3998 4.31463 10.7436 4.88081 10.9781C5.447 11.2126 6.05383 11.3333 6.66667 11.3333C7.2795 11.3333 7.88634 11.2126 8.45252 10.9781C9.01871 10.7436 9.53316 10.3998 9.9665 9.9665C10.3998 9.53316 10.7436 9.01871 10.9781 8.45252C11.2126 7.88634 11.3333 7.2795 11.3333 6.66667C11.3333 6.05383 11.2126 5.447 10.9781 4.88081C10.7436 4.31463 10.3998 3.80018 9.9665 3.36684C9.53316 2.9335 9.01871 2.58975 8.45252 2.35523C7.88634 2.12071 7.2795 2 6.66667 2C6.05383 2 5.447 2.12071 4.88081 2.35523C4.31463 2.58975 3.80018 2.9335 3.36684 3.36684C2.9335 3.80018 2.58975 4.31463 2.35523 4.88081C2.12071 5.447 2 6.05383 2 6.66667Z"
                                            stroke="white"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </g>
                                </svg>
                            </div>
                        </div>
                    {:else}
                        <div class="bg-contrast/80" />
                    {/if}
                    {#if $enableChatOnlineListStore && $navChat === "users"}
                        <!-- chat users -->
                        {#if defaultMucRoom !== undefined}
                            <UsersList mucRoom={defaultMucRoom} searchValue={searchValue.toLocaleLowerCase()} />
                        {/if}
                    {:else if $enableChat}
                        <ChatZones
                            searchValue={searchValue.toLocaleLowerCase()}
                            chatZones={[...$mucRoomsStore].filter(
                                (mucRoom) => mucRoom.type === "live" && mucRoom.name.toLowerCase().includes(searchValue)
                            )}
                        />
                        <Forums
                            searchValue={searchValue.toLocaleLowerCase()}
                            forums={[...$mucRoomsStore].filter(
                                (mucRoom) =>
                                    mucRoom.type === "forum" && mucRoom.name.toLowerCase().includes(searchValue)
                            )}
                        />
                    {/if}
                {/if}
                {#if $navChat !== "users" && $showPart !== "loading" && $showPart !== "connectionNotAuthorized"}
                    <Timeline on:activeThreadTimeLine={() => timelineActiveStore.set(true)} />
                {/if}
                {#if ENABLE_OPENID && $enableChat}
                    <div class="relative flex-none order-last bg-contrast/80 p-4">
                        <div
                            class="p-3 text-sm bg-secondary rounded w-full left-0 right-0 m-auto flex items-center pl-6 pr-3"
                        >
                            <div class="text-sm italic grow pr-2 leading-5">{$LL.signIn()}</div>
                            <button
                                type="button"
                                class="m-auto btn btn-sm btn-light cursor-pointer whitespace-nowrap !text-secondary !bold"
                                on:click={login}
                            >
                                {$LL.logIn()}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="icon icon-tabler icon-tabler-chevron-right stroke-secondary translate-x-0.5"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    fill="none"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                    <path d="M9 6l6 6l-6 6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                {/if}
                <div class="h-full bg-contrast/80 w-full grow flex-1" />
            </div>
        {/if}
    </section>
</aside>

<audio id="newMessageSound" src="./static/new-message.mp3" class="w-0 h-0 opacity-0" />

<style lang="scss">
    aside.chatWindow {
        pointer-events: auto;
        display: flex;
        flex-direction: column;
    }
</style>
