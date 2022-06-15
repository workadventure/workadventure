<script lang="ts">
    import { fly } from "svelte/transition";
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { HtmlUtils } from "../../../src/WebRtc/HtmlUtils";
    import { ChevronUpIcon } from "svelte-feather-icons";
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

    let activeThread: {
        type: string,
        user_id: integer,
        user_color: string,
        user_name: string,
        user_avatar: string,
        time: string,
        text: string,
    }  = null;

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
        user_id: integer,
        user_name: string,
        user_avatar: string,
        user_color: string,
    } =  {
        user_id: 3,
        user_name: "Grégoire",
        user_avatar: "yoda2-avatar.png",
        user_color: "#04F17A",
    };

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

    function lastMessageIsFromSameUser(userID: number, i: number) {
        // since thread displays in reverse
        let nextMsg = threadList[i + 1];
        if (!nextMsg) {
            return false;
        }
        return nextMsg.type !== 'event' &&  nextMsg.user_id === userID;
    }
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />

<aside class="chatWindow" transition:fly={{ x: -1000, duration: 500 }} bind:this={chatWindowElement}>
    <section class="tw-p-0" bind:this={listDom}>
        {#if activeThread !== null}
            <!-- thread -->
            <div class="tw-flex tw-flex-col tw-h-full tw-over">
                <div class="tw-p-5">
                    <button
                        on:click={() => {
                            activeThread = null;
                        }}
                        type="button"
                        class="tw-font-condensed tw-inline-flex tw-h-auto tw-text-sm tw-items-center tw-bg-transparent tw-border tw-border-solid tw-border-light-blue tw-text-light-blue tw-rounded tw-space-x-2 tw-py-2 tw-px-3"
                    >
                        <img src="/static/images/arrow-left-blue.png" height="9" alt="" />
                        <span> Back to chat menu </span>
                    </button>
                </div>

                <div class="tw-flex tw-flex-col-reverse tw-flex-auto tw-px-5 tw-overflow-auto">

                    <!-- if there is a user typing -->

                    {#if !!threadListUserTyping}
                        <div class="">
                            <div class="tw-flex tw-justify-start">
                                <img
                                    class={`tw-mr-2 ${
                                        threadList[0].user_id === threadListUserTyping.user_id
                                            ? "tw-invisible"
                                            : "tw-mt-4"
                                    }`}
                                    src={`/static/images/${
                                        threadListUserTyping.user_avatar
                                            ? threadListUserTyping.user_avatar
                                            : "yoda-avatar.png"
                                    }`}
                                    alt="Send"
                                    width="36"
                                />
                                <div class="">
                                    <div
                                        style={`border-bottom-color:${threadListUserTyping.user_color}`}
                                        class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xs tw-pb-1`}
                                    >
                                    <!-- if the typer sent the latest message -->
                                        {#if threadList[0].user_id !== threadListUserTyping.user_id}
                                            <span class=""> {threadListUserTyping.user_name} </span>
                                        {/if}
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
                    {/if}
                    {#each threadList as message, i}

                        <div class={`${lastMessageIsFromSameUser(message.user_id, i) ? "" : "tw-mt-4"}`}>

                            <!-- if the message is a text/attachment -->

                            {#if ["message", "attachment"].includes(message.type)}
                                <div class={`tw-flex ${message.me ? "tw-justify-end" : "tw-justify-start"}`}>
                                    <div
                                        class={`tw-w-3/4 tw-flex tw-items-start ${
                                            message.me ? "tw-flex-row-reverse" : ""
                                        }`}
                                    >
                                        {#if !message.me}

                                        <!-- make image invisible and omit vertical margin if last message was by same user -->
                                            <img
                                                class={`tw-mr-2 ${
                                                    lastMessageIsFromSameUser(message.user_id, i)
                                                        ? "tw-invisible "
                                                        : "tw-mt-4"
                                                }`}
                                                src={`/static/images/${
                                                    message.user_avatar ? message.user_avatar : "yoda-avatar.png"
                                                }`}
                                                alt="Send"
                                                width="36"
                                            />
                                        {/if}

                                        <div class={`tw-flex-auto ${message.me ? "" : ""}`}>

                                            <!-- message content -->

                                            {#if message.type === "message"}
                                                <div
                                                    style={`border-bottom-color:${message.user_color}`}
                                                    class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xs tw-pb-1`}
                                                >

                                                <!-- if last message was by this user, ignore this part -->
                                                    {#if !lastMessageIsFromSameUser(message.user_id, i)}
                                                        {#if message.me}
                                                            <span> Me </span>
                                                        {:else}
                                                            <span>
                                                                {message.user_name}
                                                            </span>
                                                        {/if}
                                                        <span>
                                                            {message.time}
                                                        </span>
                                                    {/if}


                                                </div>

                                                <div class={`tw-rounded-lg tw-bg-dark tw-text-xs tw-p-3`}>
                                                    <p class="tw-mb-0">{message.text}</p>
                                                </div>

                                            {:else if message.type === "attachment"}

                                            <!-- attachment content -->

                                            <div class="tw-flex tw-mt-1">
                                                <div class="tw-rounded tw-border tw-border-solid tw-border-[#979797] tw-p-3">

                                                    <div class="tw-text-xs tw-italic tw-mb-2">
                                                        <span class="tw-font-bold" style={`color:${message.user_color}`}>Grégoire</span>
                                                        <span>
                                                            a envoyer un fichier
                                                        </span>
                                                    </div>
                                                    <img src="/static/images/attach.svg" alt="attachment" />

                                                </div>
                                            </div>
                                            {/if}
                                        </div>
                                    </div>
                                </div>

                            <!-- if the message is an event, like someone joining the conversation -->

                            {:else if message.type === "event"}
                                <div class="tw-flex tw-justify-center">
                                    <div
                                        class="tw-rounded-[13px] tw-justify-center tw-px-2 tw-py-1 tw-text-xs tw-italic tw-border tw-border-solid tw-border-light-purple"
                                    >
                                        <span class="tw-font-bold" style={`color:${message.user_color}`}>
                                            {message.user_name}
                                        </span>

                                        {message.info}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>

                <div class="messageForm">
                    <ChatMessageForm bind:handleForm={handleFormBlur} />
                </div>
            </div>

        {:else}
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

            <div class="tw-border-b tw-border-solid tw-border-transparent tw-border-b-light-purple tw-overflow-auto">
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
                        {#each users as user}
                            <div
                                on:click={() => {
                                    activeThread = user;
                                }}
                            >
                                <ChatUser {user} />
                            </div>
                        {/each}
                    </div>
                    <div class="tw-px-4 tw-mb-6  tw-flex tw-justify-end">
                        <button class="tw-underline tw-text-sm tw-text-lighter-purple tw-font-condensed hover:tw-underline">See more…</button>
                    </div>
                {/if}
            </div>

            <!-- forum list -->

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
                            <ChatForum {forum} />
                        {/each}
                    </div>
                    <div class="tw-px-4 tw-mb-6 tw-flex tw-justify-end">
                        <button class="tw-underline tw-text-sm tw-text-lighter-purple tw-font-condensed hover:tw-underline">See more…</button>
                    </div>
                {/if}
            </div>
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
        height: 100vh;
        width: 30vw;
        min-width: 350px;
        background: rgba(#1b1b29, 0.9);
        color: whitesmoke;
        display: flex;
        flex-direction: column;
    }
</style>
