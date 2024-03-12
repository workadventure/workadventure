<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber, derived } from "svelte/store";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import { localeDetector } from "../../../i18n/locales";
    import ChatZones from "./ChatZones.svelte";
    import ChatActiveThread from "./ChatActiveThread.svelte";
    import ChatActiveThreadTimeLine from "./Timeline/ChatActiveThreadTimeline.svelte";
    import Timeline from "./Timeline/Timeline.svelte";
    import UsersList from "./UsersList.svelte";
    import Loader from "./Loader.svelte";
    import NeedRefresh from "./NeedRefresh.svelte";
    import Forums from "./Forums.svelte";
    import { mucRoomsStore, xmppServerConnectionStatusStore } from "../Stores/MucRoomsStore";
    import { activeThreadStore } from "../Stores/ActiveThreadStore";
    import { availabilityStatusStore } from "../../Stores/MediaStore";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import { sendLogin } from "../Utils";
    import { userStore } from "../Stores/LocalUserStore";
    import { ENABLE_OPENID } from "../../Enum/EnvironmentVariable";
    import { connectionEstablishedStore, navChat, showChatZonesStore, showForumsStore, showPart, showTimelineStore, timelineActiveStore } from "../Stores/ChatStore";
    import { connectionManager } from "../../Connection/ConnectionManager";

    let chatWindowElement: HTMLElement;
    let handleFormBlur: { blur(): void };

    let searchValue = "";

    let defaultMucRoom: MucRoom | undefined = undefined;
    let subscribeListeners = new Array<Unsubscriber>();
    let subscribeTotalMessagesToSee: Unsubscriber;

    onMount(async () => {
        if (!$locale) {
            await localeDetector();
        }
        
        subscribeListeners.push(
            mucRoomsStore.subscribe((mucRooms) => {
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
            sendLogin();
        }
    }

    $: loadingText = $userStore
        ? !$connectionEstablishedStore
            ? $LL.chat.connecting()
            : $LL.chat.waitingInit()
        : $LL.chat.waitingData();

    console.info("Chat fully loaded");
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />





<aside 
class=" chatWindow tw-border-0  tw-h-full tw-w-full " id="chatWorkAdventure" bind:this={chatWindowElement}>
    <section class=" tw-p-0 tw-m-0">
        {#if $showPart === "activeTimeline"}
            <ChatActiveThreadTimeLine on:unactiveThreadTimeLine={() => timelineActiveStore.set(false)} />
        {:else if $showPart === "activeThread" && !["connectionNotAuthorized", "loading"].includes($showPart)}
            {#if $activeThreadStore !== undefined}
                <ChatActiveThread activeThread={$activeThreadStore} />
            {/if}
        {:else if ["home", "connectionNotAuthorized", "loading"].includes($showPart)}
            <div class="wa-message-bg tw-pt-3  tw-h-full tw-w-full">
                {#if $showPart === "connectionNotAuthorized"}
                    <NeedRefresh />
                {:else if $showPart === "loading"}
                    <Loader
                        text={loadingText}
                        height="tw-h-40 tw-border-solid tw-border-transparent tw-border-b-light-purple tw-border-b"
                    />
                {:else}
                    {#if connectionManager.currentRoom?.enableChatOnlineList}
                        <nav class="nav">
                            <div class="background" class:chat={$navChat === "chat"} />
                            <ul>
                                <li class:active={$navChat === "users"} on:click={() => navChat.set("users")}>
                                    {$LL.chat.users()}
                                </li>
                                <li class:active={$navChat === "chat"} on:click={() => navChat.set("chat")}>Chat</li>
                            </ul>
                        </nav>
                        <!-- searchbar -->
                        <div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
                            <div class="tw-p-3">
                                <input
                                    class="wa-searchbar tw-block tw-text-white tw-w-full placeholder:tw-text-sm tw-rounded-3xl tw-px-3 tw-py-1 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
                                    placeholder={$navChat === "users" ? $LL.chat.searchUser() : $LL.chat.searchChat()}
                                    bind:value={searchValue}
                                />
                            </div>
                        </div>
                    {:else}
                        <div
                            class="tw-mt-11 tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid"
                        />
                    {/if}
                    {#if !userStore.get().isLogged && ENABLE_OPENID && connectionManager.currentRoom?.enableChat}
                        <div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
                            <div class="tw-p-3 tw-text-sm tw-text-center">
                                <p>{$LL.chat.signIn()}</p>
                                <button
                                    type="button"
                                    class="light tw-m-auto tw-cursor-pointer tw-px-3"
                                    on:click={login}
                                >
                                    {$LL.chat.logIn()}
                                </button>
                            </div>
                        </div>
                    {/if}
                    {#if connectionManager.currentRoom?.enableChatOnlineList && $navChat === "users"}
                        <!-- chat users -->
                        {#if defaultMucRoom !== undefined}
                            <UsersList mucRoom={defaultMucRoom} searchValue={searchValue.toLocaleLowerCase()} />
                        {/if}
                    {:else if connectionManager.currentRoom?.enableChat}
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
