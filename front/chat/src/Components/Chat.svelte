<script lang="ts">
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { HtmlUtils } from "../Utils/HtmlUtils";
    import Loader from "./Loader.svelte";
    import { mucRoomsStore, xmppServerConnectionStatusStore } from "../Stores/MucRoomsStore";
    import UsersList from "./UsersList.svelte";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { userStore } from "../Stores/LocalUserStore";
    import LL from "../i18n/i18n-svelte";
    import { localeDetector } from "../i18n/locales";
    import { locale } from "../i18n/i18n-svelte";
    import ChatLiveRooms from "./ChatLiveRooms.svelte";
    import { activeThreadStore } from "../Stores/ActiveThreadStore";
    import ChatActiveThread from "./ChatActiveThread.svelte";
    import ChatActiveThreadTimeLine from "./Timeline/ChatActiveThreadTimeline.svelte";
    import Timeline from "./Timeline/Timeline.svelte";
    import { timelineMessagesToSee, timelineOpenedStore } from "../Stores/ChatStore";
    import { Unsubscriber, derived } from "svelte/store";
    import { connectionManager } from "../Connection/ChatConnectionManager";

    let listDom: HTMLElement;
    let chatWindowElement: HTMLElement;
    let handleFormBlur: { blur(): void };
    let autoscroll: boolean;

    let searchValue = "";
    let showUsers = true;
    let showLives = true;
    let activeThreadTimeLine = false;

    beforeUpdate(() => {
        autoscroll = listDom && listDom.offsetHeight + listDom.scrollTop > listDom.scrollHeight - 20;
    });

    let defaultMucRoom: MucRoom | undefined = undefined;
    let subscribers = new Array<Unsubscriber>();

    $: totalMessagesToSee = derived(
        [...[...$mucRoomsStore].map((mucRoom) => mucRoom.getCountMessagesToSee()), timelineMessagesToSee],
        ($totalMessagesToSee) => $totalMessagesToSee.reduce((sum, number) => sum + number, 0)
    );

    onMount(async () => {
        if (!$locale) {
            await localeDetector();
        }
        listDom.scrollTo(0, listDom.scrollHeight);
        subscribers.push(
            mucRoomsStore.subscribe(() => {
                try {
                    defaultMucRoom = mucRoomsStore.getDefaultRoom();
                } catch (e: unknown) {
                    console.error("Error get default room =>", e);
                }
            })
        );
        subscribers.push(
            totalMessagesToSee.subscribe((total) => {
                window.parent.postMessage({ type: "chatTotalMessagesToSee", data: total }, "*");
            })
        );
    });

    afterUpdate(() => {
        if (autoscroll) listDom.scrollTo(0, listDom.scrollHeight);
    });

    function onClick(event: MouseEvent) {
        if (handleFormBlur && HtmlUtils.isClickedOutside(event, chatWindowElement)) {
            handleFormBlur.blur();
        }
    }

    function handleActiveThread(event: unknown) {
        activeThreadStore.set((event as { detail: MucRoom | undefined }).detail);
    }
    function handleShowUsers() {
        showUsers = !showUsers;
    }
    function handleShowLives() {
        showLives = !showLives;
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

    mucRoomsStore.subscribe(() => {
        defaultMucRoom = mucRoomsStore.getDefaultRoom();
    });

    console.info("Chat fully loaded");
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />

<aside class="chatWindow" bind:this={chatWindowElement}>
    <section class="tw-p-0 tw-m-0" bind:this={listDom}>
        {#if !connectionManager.connection || !$xmppServerConnectionStatusStore}
            <Loader text={$userStore ? $LL.reconnecting() : $LL.waitingData()} />
        {:else if activeThreadTimeLine}
            <ChatActiveThreadTimeLine on:unactiveThreadTimeLine={() => (activeThreadTimeLine = false)} />
        {:else if $activeThreadStore !== undefined}
            <ChatActiveThread
                activeThread={$activeThreadStore}
                on:goTo={(event) =>
                    $activeThreadStore?.goTo(event.detail.type, event.detail.playUri, event.detail.uuid)}
                on:rankUp={(event) => $activeThreadStore?.sendRankUp(event.detail.jid)}
                on:rankDown={(event) => $activeThreadStore?.sendRankDown(event.detail.jid)}
                on:ban={(event) =>
                    $activeThreadStore?.sendBan(event.detail.user, event.detail.name, event.detail.playUri)}
            />
        {:else}
            <div class="wa-message-bg">
                <!-- searchbar -->
                <div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
                    <div class="tw-p-3">
                        <input
                            class="wa-searchbar tw-block tw-text-white tw-w-full placeholder:tw-text-sm tw-rounded-3xl tw-px-3 tw-py-1 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
                            placeholder={$LL.search()}
                            bind:value={searchValue}
                            on:input={() => timelineOpenedStore.set(false)}
                        />
                    </div>
                </div>
                <!-- chat users -->
                {#if defaultMucRoom !== undefined}
                    <UsersList
                        mucRoom={defaultMucRoom}
                        {showUsers}
                        usersListStore={defaultMucRoom?.getPresenceStore()}
                        meStore={defaultMucRoom?.getMeStore()}
                        searchValue={searchValue.toLocaleLowerCase()}
                        on:activeThread={handleActiveThread}
                        on:showUsers={handleShowUsers}
                        on:goTo={(event) =>
                            defaultMucRoom?.goTo(event.detail.type, event.detail.playUri, event.detail.uuid)}
                        on:rankUp={(event) => defaultMucRoom?.sendRankUp(event.detail.jid)}
                        on:rankDown={(event) => defaultMucRoom?.sendRankDown(event.detail.jid)}
                        on:ban={(event) =>
                            defaultMucRoom?.sendBan(event.detail.user, event.detail.name, event.detail.playUri)}
                    />
                {/if}

                <ChatLiveRooms
                    {showLives}
                    searchValue={searchValue.toLocaleLowerCase()}
                    on:activeThread={handleActiveThread}
                    on:showLives={handleShowLives}
                    liveRooms={[...$mucRoomsStore].filter(
                        (mucRoom) => mucRoom.type === "live" && mucRoom.name.toLowerCase().includes(searchValue)
                    )}
                />

                <Timeline on:activeThreadTimeLine={() => (activeThreadTimeLine = true)} />
            </div>
        {/if}
    </section>
</aside>

<audio id="newMessageSound" src="/static/new-message.mp3" style="width: 0;height: 0;opacity: 0" />

<style lang="scss">
    aside.chatWindow {
        pointer-events: auto;
        //background: rgba(27, 27, 41, 0.79);
        color: whitesmoke;
        display: flex;
        flex-direction: column;
    }
</style>
