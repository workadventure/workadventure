<script lang="ts">
    import { fly } from "svelte/transition";
    import { chatMessagesStore, chatVisibilityStore } from "../../Stores/ChatStore";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import ChatElement from "./ChatElement.svelte";
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import { ChevronUpIcon } from "svelte-feather-icons";
    import LL from "../../i18n/i18n-svelte";
    import ChatUser from "./ChatUser.svelte";
    import ChatForum from "./ChatForum.svelte";

    let listDom: HTMLElement;
    let chatWindowElement: HTMLElement;
    let handleFormBlur: { blur(): void };
    let autoscroll: boolean;

    let users = [
        {
            name: "Grégoire",
            status: "In meeting room",
            unreads: 0,
            active: true,
        },
        {
            name: "Julie",
            status: "In meeting room",
            unreads: 0,
            active: true,
        },
        {
            name: "Gaëlle",
            status: "Talking with someone",
            unreads: 2,
            active: true,
        },
        {
            name: "Hugo",
            status: "Free",
            unreads: 0,
            active: true,
        },
        {
            name: "Bernadette",
            status: "Offline",
            unreads: 0,
            active: false,
        },
    ];

    let showUsers = true;
    let usersListUnreads = () => {
        let n = 0;
        users.forEach((u) => {
            n += u.unreads || 0;
        });
        return n;
    };

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

    let forumListUnreads = () => {
        let n = 0;
        forums.forEach((f) => {
            n += f.unreads || 0;
        });
        return n;
    };

    let showForums = true;

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

    function closeChat() {
        chatVisibilityStore.set(false);
    }
    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeChat();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />

<aside class="chatWindow" transition:fly={{ x: -1000, duration: 500 }} bind:this={chatWindowElement}>
    <section class="tw-p-0" bind:this={listDom}>
        <!-- searchbar -->
        <div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
            <div class="tw-p-3">
                <input
                    class="wa-searchbar tw-block tw-text-white tw-w-full placeholder:tw-text-sm tw-rounded-3xl tw-p-3 tw-pl-6 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
                    placeholder="Search for user, message, channel, etc."
                />
            </div>
        </div>

        <!-- chat users -->

        <div class="tw-px-3 tw-border-b tw-border-solid tw-border-transparent tw-border-b-light-purple">
            <div class="tw-p-3 tw-flex tw-items-center">
                {#if usersListUnreads()}
                    <span
                        class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
                    >
                        {usersListUnreads()}
                    </span>
                {/if}
                <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Users</p>
                <button
                    class="tw-text-lighter-purple"
                    on:click={() => {
                        showUsers = !showUsers;
                    }}
                >
                    <ChevronUpIcon class={`tw-transform tw-transition ${showUsers ? "" : "tw-rotate-180"}`} />
                </button>
            </div>
            {#if showUsers}
                <div class="tw-mt-3">
                    {#each users as user, i}
                        <ChatUser {user} />
                    {/each}
                </div>
                <div class="tw-px-4 tw-mb-6  tw-flex tw-justify-end">
                    <span class="tw-underline tw-text-sm tw-text-lighter-purple">See more…</span>
                </div>
            {/if}
        </div>

        <!-- forum list -->

        <div class="tw-px-3 tw-border-b tw-border-solid tw-border-transparent tw-border-b-light-purple">
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
                    {#each forums as forum, i}
                        <ChatForum {forum} />
                    {/each}
                </div>
                <div class="tw-px-4 tw-mb-6 tw-flex tw-justify-end">
                    <span class="tw-underline tw-text-sm tw-text-lighter-purple">See more…</span>
                </div>
            {/if}
        </div>
    </section>
</aside>

<style lang="scss">
    aside.chatWindow {
        z-index: 1000;
        pointer-events: auto;
        position: absolute;
        top: 0;
        left: 0;
        height: 100vh;
        width: 30vw;
        min-width: 350px;
        background: rgba(#1b1b29, 0.9);
        color: whitesmoke;
        display: flex;
        flex-direction: column;
    }
</style>
