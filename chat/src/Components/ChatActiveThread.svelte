<script lang="ts">
    import { EyeIcon, EyeOffIcon } from "svelte-feather-icons";
    import { onDestroy } from "svelte";
    import { get } from "svelte/store";
    import { LL } from "../i18n/i18n-svelte";
    import { activeThreadStore, settingsViewStore, usersListViewStore } from "../Stores/ActiveThreadStore";
    import { MucRoom } from "../Xmpp/MucRoom";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import ChatUser from "./ChatUser.svelte";
    import ChatMessagesList from "./ChatMessagesList.svelte";
    import OnlineUsers from "./OnlineUsers.svelte";
    import Loader from "./Loader.svelte";

    export let activeThread: MucRoom;

    let formHeight = 0;

    const presenceStore = activeThread.getPresenceStore();
    const readyStore = activeThread.getRoomReadyStore();
    const me = presenceStore.get(activeThread.myJID);

    let messagesList: ChatMessagesList;

    function handleFormHeight(height: number) {
        formHeight = height;
    }

    onDestroy(() => {
        settingsViewStore.set(false);
        usersListViewStore.set(false);
    });
</script>

<!-- thread -->
<div id="activeThread" class="flex flex-col h-full min-h-full over w-full">
    <div
        class="wa-thread-head fixed w-full border-x-0 border-b border-t-0 border-solid border-white/30 backdrop-blur z-20 bg-contrast/80"
    >
        <div class="title relative py-2">
            <div class="absolute left-3 top-3">
                <button
                    class="exit p-2 hover:bg-white/20 rounded cursor-pointer"
                    on:click={() => {
                        activeThreadStore.reset();
                    }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler icon-tabler-chevron-left"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="#ffffff"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M15 6l-6 6l6 6" />
                    </svg>
                </button>
            </div>
            <div class="text-center p-2 pt-3">
                <div class="flex justify-center">
                    <div>{activeThread.name}</div>
                    {#if activeThread.type === "live"}
                        <div class="block relative ml-7 mt-1">
                            <span class="w-4 h-4 bg-pop-red block rounded-full absolute right-0 top-0 animate-ping" />
                            <span class="w-3 h-3 bg-pop-red block rounded-full absolute right-0.5 top-0.5" />
                        </div>
                    {/if}
                </div>
                <div
                    class="flex flex-wrap justify-center gap-x-1 text-pop-green cursor-pointer items-center"
                    on:click={() => usersListViewStore.set(!$usersListViewStore)}
                >
                    <OnlineUsers {presenceStore} />
                    {#if $usersListViewStore}<EyeOffIcon size="13" />{:else}<EyeIcon size="13" />{/if}
                </div>
            </div>
            <!--
               <div id="settings" class="py-1 w-14 self-stretch flex justify-center align-middle">

               <button class="text-lighter-purple m-0">
                   {#if $settingsViewStore}
                       <MessageCircleIcon />
                   {:else}
                       <SettingsIcon />
                   {/if}
               </button>
            </div>
           -->
        </div>
        {#if $me && $me.isAdmin}
            <div class="absolute right-4 top-3">
                <div class="wa-message-bg">
                    <button class="p-2 hover:bg-white/20 cursor-pointer rounded">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-dots"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                            <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                            <path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                        </svg>
                    </button>
                    <!--<button class="wa-action btn btn-sm btn-light btn-border" type="button" on:click|stopPropagation={reInitialize}>
                        <RefreshCwIcon size="13" class="mr-2" />
                        {$LL.reinit()}
                    </button>-->
                </div>
            </div>
        {/if}
    </div>
    {#if !$readyStore}
        <Loader text={$LL.loading()} />
    {:else if $usersListViewStore}
        <div class="flex flex-col flex-auto w-full">
            <div class="users wa-message-bg border border-transparent border-b-light-purple border-solid">
                <p class="px-5 py-3 text-light-blue mb-0 text-sm flex-auto">
                    {$LL.users()}
                </p>
                {#each $presenceStore
                    .filter((user) => get(user).active)
                    .sort((a, b) => get(a).name.localeCompare(get(b).name)) as user (get(user).jid)}
                    <ChatUser mucRoom={activeThread} user={get(user)} searchValue="" />
                {/each}
            </div>
        </div>
    {/if}
    <div class:hidden={$usersListViewStore}>
        <ChatMessagesList mucRoom={activeThread} bind:this={messagesList} {formHeight} />
        <div class="messageForm bottom-0 w-full fixed z-20">
            <ChatMessageForm
                mucRoom={activeThread}
                on:formHeight={(event) => handleFormHeight(event.detail)}
                on:scrollDown={messagesList.scrollDown}
            />
        </div>
    </div>
</div>

<style lang="scss">
</style>
