<script lang="ts">
    import { ArrowLeftIcon, RefreshCwIcon, EyeIcon, EyeOffIcon } from "svelte-feather-icons";
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
<div id="activeThread" class="flex flex-col h-full min-h-full over w-full pt-24">
    <div class="wa-thread-head">
        <div class="title">
            <div class="py-1 w-14 self-stretch flex justify-center align-middle">
                <button
                    class="exit text-lighter-purple m-0"
                    on:click={() => {
                        activeThreadStore.reset();
                    }}
                >
                    <ArrowLeftIcon />
                </button>
            </div>
            <div class="text-center pt-2 pb-3">
                <div class="flex justify-center">
                    <b>{activeThread.name}</b>
                    {#if activeThread.type === "live"}
                        <div class="block relative ml-7 mt-1">
                            <span
                                class="w-4 h-4 bg-pop-red block rounded-full absolute right-0 top-0 animate-ping"
                            />
                            <span
                                class="w-3 h-3 bg-pop-red block rounded-full absolute right-0.5 top-0.5"
                            />
                        </div>
                    {/if}
                </div>
                <div
                    class="flex flex-wrap gap-x-1 text-pop-green cursor-pointer items-center"
                    on:click={() => usersListViewStore.set(!$usersListViewStore)}
                >
                    <OnlineUsers {presenceStore} />
                    {#if $usersListViewStore}<EyeOffIcon size="13" />{:else}<EyeIcon size="13" />{/if}
                </div>
            </div>
            <div id="settings" class="py-1 w-14 self-stretch flex justify-center align-middle">
                <!--
            <button class="text-lighter-purple m-0">
                {#if $settingsViewStore}
                    <MessageCircleIcon />
                {:else}
                    <SettingsIcon />
                {/if}
            </button>
            -->
            </div>
        </div>
        {#if $me && $me.isAdmin}
            <div class="flex flex-col flex-auto w-full">
                <div
                    class="wa-message-bg border border-transparent border-b-light-purple border-solid px-5 pb-0.5"
                >
                    <button class="wa-action" type="button" on:click|stopPropagation={() => activeThread.reInitialize()}
                        ><RefreshCwIcon size="13" class="mr-2" /> {$LL.reinit()}
                    </button>
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
        <div class="messageForm">
            <ChatMessageForm
                mucRoom={activeThread}
                on:formHeight={(event) => handleFormHeight(event.detail)}
                on:scrollDown={messagesList.scrollDown}
            />
        </div>
    </div>
</div>

<style lang="scss">
    .messageForm {
        position: fixed;
        bottom: 0;
        width: 100%;
    }
</style>
