<script lang="ts">
    import { fly } from "svelte/transition";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { HtmlUtils } from "../Utils/HtmlUtils";
    import { SettingsIcon, ArrowLeftIcon } from "svelte-feather-icons";
    //import ChatForum from "./ChatForum.svelte";
    import {connectionStore} from "../Stores/ConnectionStore";
    //import LL from "../i18n/i18n-svelte";
    import Loader from "./Loader.svelte";
    import {mucRoomsStore, xmppServerConnectionStatusStore} from "../Stores/MucRoomsStore";
    import UsersList from "./UsersList.svelte";
    import {MucRoom} from "../Xmpp/MucRoom";
    import {userStore} from "../Stores/LocalUserStore";
    import LL from "../i18n/i18n-svelte";
    import ChatLiveRooms from "./ChatLiveRooms.svelte";
    import {activeThreadStore} from "../Stores/ActiveThreadStore";
    import {get} from "svelte/store";
    import ChatActiveThread from "./ChatActiveThread.svelte";

    let listDom: HTMLElement;
    let chatWindowElement: HTMLElement;
    let handleFormBlur: { blur(): void };
    let autoscroll: boolean;

    let searchValue = '';
    let showUsers = true;
    let showLives = true;

    /*
    let forums = [
        {
            name: "Inside Workadventu.re",
            activeUsers: 5,
            unreads: 1,
        },
        {
            name: "Random",
            activeUsers: 12,
            unreads: 0,
        },
        {
            name: "World makers",
            activeUsers: 4,
            unreads: 5,
        },
    ];
     */

    let threadList = [
        // newest first
        {
            type: "message",
            user_id: 3,
            user_color: "#04F17A",
            user_name: "Grégoire",
            user_avatar: "yoda2-avatar.png",
            time: "2 min ago",
            text: "Check that",
        },
        {
            type: "attachment",
            user_id: 3,
            user_color: "#04F17A",
            user_name: "Grégoire",
            user_avatar: "yoda2-avatar.png",
            info: "a rejoint conversation",
        },

        {
            type: "message",
            user_id: 3,
            user_color: "#04F17A",
            user_name: "Grégoire",
            user_avatar: "yoda2-avatar.png",
            time: "2 min ago",
            text: "Etiam rutrum, velit et auctor iaculis, massa leo luctus tellus, sit amet bibendum arcu augue in odio. ",
        },
        {
            type: "event",
            user_id: 3,
            user_color: "#04F17A",
            user_name: "Grégoire",
            info: "a rejoint conversation",
        },
        {
            type: "message",
            user_name: "Me",
            user_id: 1,
            user_color: "#FF475a",
            time: "2 min ago",
            me: true,
            text: "My last message",
        },
        {
            type: "message",
            user_name: "Me",
            user_id: 1,
            user_color: "#FF475a",
            time: "2 min ago",
            me: true,
            text: "Donec varius lacus sit amet finibus pharetra.",
        },
        {
            type: "message",
            user_id: 2,
            user_name: "Bernadette",
            user_avatar: "yoda-avatar.png",
            user_color: "#365DFF",
            time: "2 min ago",
            text: "Another message",
        },
        {
            type: "message",
            user_id: 2,
            user_name: "Bernadette",
            user_avatar: "yoda-avatar.png",
            user_color: "#365DFF",
            time: "2 min ago",
            text: "Aliquam sollicitudin massa non massa gravida, id bibendum nulla feugiat. Etiam rutrum, velit et auctor iaculis, massa leo luctus tellus, sit amet bibendum arcu",
        },
        {
            type: "message",
            user_id: 2,
            user_name: "Bernadette",
            user_avatar: "yoda-avatar.png",
            user_color: "#365DFF",
            time: "2 min ago",
            text: "Nam tempus turpis et nulla luctus posuere. Nam lobortis, libero sed varius pellentesque, tellus mauris mollis eros, eget pretium quam nulla sit amet quam",
        },
        {
            type: "message",
            user_name: "Me",
            user_id: 1,
            user_color: "#FF475a",
            time: "4 min ago",
            me: true,
            text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam convallis, dolor vitae tempor porta, dui nisl volutpat ligula",
        },
        {
            type: "message",
            user_id: 2,
            user_color: "#365DFF",
            user_name: "Bernadette",
            user_avatar: "yoda-avatar.png",
            time: "9 min ago",
            text: "Nam lacinia, leo eleifend aliquet varius, lorem massa gravida nunc, vel tempus dui diam eu nisl.  ",
        },
        {
            type: "message",
            user_name: "Bernadette",
            user_avatar: "yoda-avatar.png",
            user_color: "#365DFF",
            user_id: 2,
            time: "10 min ago",
            text: "Nunc eget congue arcu. ",
        },
    ];

    let threadListUserTyping: {
        user_id: number;
        user_name: string;
        user_avatar: string;
        user_color: string;
    } = {
        user_id: 3,
        user_name: "Grégoire",
        user_avatar: "yoda2-avatar.png",
        user_color: "#04F17A",
    };

    beforeUpdate(() => {
        autoscroll = listDom && listDom.offsetHeight + listDom.scrollTop > listDom.scrollHeight - 20;
    });

    onMount(() => {
        listDom.scrollTo(0, listDom.scrollHeight);
    });

    afterUpdate(() => {
        if (autoscroll) listDom.scrollTo(0, listDom.scrollHeight);
    });

    function onClick(event: MouseEvent) {
        if (HtmlUtils.isClickedOutside(event, chatWindowElement)) {
            handleFormBlur.blur();
        }
    }

    function handleActiveThread(event: any){
        activeThreadStore.set(event.detail);
    }
    function handleShowUsers(){
        showUsers = !showUsers;
    }
    function handleShowLives(){
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

    function lastMessageIsFromSameUser(userID: number, i: number) {
        // since thread displays in reverse
        let nextMsg = threadList[i + 1];
        if (!nextMsg) {
            return false;
        }
        return nextMsg.type !== "event" && nextMsg.user_id === userID;
    }

    const defaultRoom = (): MucRoom => {
        const defaultMucRoom = [...$mucRoomsStore].find(mucRoom => mucRoom.type === 'default');
        if(!defaultMucRoom){
            throw new Error('No default MucRoom');
        }
        return defaultMucRoom;
    }

    console.info("Chat fully loaded");
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />

<aside class="chatWindow" bind:this={chatWindowElement}>
    <section class="tw-p-0 tw-m-0" bind:this={listDom}>
        {#if !$connectionStore || !$xmppServerConnectionStatusStore}
            <Loader text={$userStore?$LL.reconnecting():$LL.waitingData()}/>
        {:else}
            {#if $activeThreadStore}
                <ChatActiveThread
                        messagesStore={$activeThreadStore.getMessagesStore()}
                        usersListStore={$activeThreadStore.getPresenceStore()}
                        activeThread={$activeThreadStore}
                        on:goTo={(event) => $activeThreadStore.goTo(event.detail.type, event.detail.roomId, event.detail.uuid)}
                />
            {:else}
                <div>
                    <!-- searchbar -->
                    <div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
                        <div class="tw-p-3">
                            <input
                                    class="wa-searchbar tw-block tw-text-white tw-w-full placeholder:tw-text-sm tw-rounded-3xl tw-p-3 tw-pl-6 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
                                    placeholder={$LL.search()}
                                    bind:value={searchValue}
                            />
                        </div>
                    </div>
                    <!-- chat users -->
                    <UsersList
                            usersListStore={defaultRoom().getPresenceStore()}
                            {showUsers}
                            searchValue={searchValue.toLocaleLowerCase()}
                            on:activeThread={handleActiveThread}
                            on:showUsers={handleShowUsers}
                            on:goTo={(event) => defaultRoom().goTo(event.detail.type, event.detail.roomId, event.detail.uuid)}
                    />

                    <ChatLiveRooms
                            {showLives}
                            on:activeThread={handleActiveThread}
                            on:showLives={handleShowLives}
                            liveRooms={[...$mucRoomsStore].filter(mucRoom => mucRoom.type === 'live')}
                    />

                    <!-- forum list

					<div class="tw-border-b tw-border-solid tw-border-transparent tw-border-b-light-purple">
						<div class="tw-p-3 tw-flex tw-items-center">
							{#if forumListUnreads()}
						<span
								class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
						>
							{forumListUnreads()}
						</span>
							{/if}
							<p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Forums</p>
							<button
									class="tw-text-lighter-purple"
									on:click={() => {
							showForums = !showForums;
						}}
							>
								<ChevronUpIcon class={`tw-transform tw-transition ${showForums ? "" : "tw-rotate-180"}`} />
							</button>
						</div>
						{#if showForums}
							<div class="tw-mt-3">
								{#each forums as forum}
									<ChatForum {forum} {openForum} />
								{/each}
							</div>
							<div class="tw-px-4 tw-mb-6 tw-flex tw-justify-end">
								<button
										class="tw-underline tw-text-sm tw-text-lighter-purple tw-font-condensed hover:tw-underline"
								>See more…</button
								>
							</div>
						{/if}
					</div>
					-->
                </div>
            {/if}
        {/if}
    </section>
</aside>

<style lang="scss">
    aside.chatWindow {
        z-index: 1000;
        pointer-events: auto;
        position: absolute;
        top: 0;
        left: 0;
        min-height: 100vh;
        width: 100%;
        min-width: 350px;
        background: rgba(#1b1b29, 0.9);
        color: whitesmoke;
        display: flex;
        flex-direction: column;
    }
</style>
