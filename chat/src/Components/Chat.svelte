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

<aside class="chatWindow" bind:this={chatWindowElement}>
    <section class="p-0 m-0">
        {#if $showPart === "activeTimeline"}
            <ChatActiveThreadTimeLine on:unactiveThreadTimeLine={() => timelineActiveStore.set(false)} />
        {:else if $showPart === "activeThread" && !["connectionNotAuthorized", "loading"].includes($showPart)}
            {#if $activeThreadStore !== undefined}
                <ChatActiveThread activeThread={$activeThreadStore} />
            {/if}
        {:else if ["home", "connectionNotAuthorized", "loading"].includes($showPart)}
            <div class="wa-message-bg pt-3">
                {#if $showPart === "connectionNotAuthorized"}
                    <NeedRefresh />
                {:else if $showPart === "loading"}
                    <Loader
                        text={loadingText}
                        height="h-40 border-solid border-transparent border-b-light-purple border-b"
                    />
                {:else}
                    {#if $enableChatOnlineListStore}
                        <nav class="nav">
                            <div class="background" class:chat={$navChat === "chat"} />
                            <ul>
                                <li class:active={$navChat === "users"} on:click={() => navChat.set("users")}>
                                    {$LL.users()}
                                </li>
                                <li class:active={$navChat === "chat"} on:click={() => navChat.set("chat")}>Chat</li>
                            </ul>
                        </nav>
                        <!-- searchbar -->
                        <div class="border border-transparent border-b-light-purple border-solid">
                            <div class="p-3">
                                <input
                                    class="wa-searchbar block text-white w-full placeholder:text-sm rounded-3xl px-3 py-1 border-light-purple border border-solid bg-transparent"
                                    placeholder={$navChat === "users" ? $LL.searchUser() : $LL.searchChat()}
                                    bind:value={searchValue}
                                />
                            </div>
                        </div>
                    {:else}
                        <div class="mt-11 border border-transparent border-b-light-purple border-solid" />
                    {/if}
                    {#if !userStore.get().isLogged && ENABLE_OPENID && $enableChat}
                        <div class="border border-transparent border-b-light-purple border-solid">
                            <div class="p-3 text-sm text-center">
                                <p>{$LL.signIn()}</p>
                                <button type="button" class="light m-auto cursor-pointer px-3" on:click={login}>
                                    {$LL.logIn()}
                                </button>
                            </div>
                        </div>
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
                {#if $navChat !== "users"}
                    <Timeline on:activeThreadTimeLine={() => timelineActiveStore.set(true)} />
                {/if}
            </div>
        {/if}
    </section>
</aside>

<audio id="newMessageSound" src="./static/new-message.mp3" style="width: 0;height: 0;opacity: 0" />

<style lang="scss">
    aside.chatWindow {
        pointer-events: auto;
        color: whitesmoke;
        display: flex;
        flex-direction: column;
    }
</style>
