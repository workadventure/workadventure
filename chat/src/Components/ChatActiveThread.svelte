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
<div id="activeThread" class="tw-flex tw-flex-col tw-h-full tw-min-h-full tw-over tw-w-full tw-pt-24">
    <div class="wa-thread-head">
        <div class="title">
            <div class="tw-py-1 tw-w-14 tw-self-stretch tw-flex tw-justify-center tw-align-middle">
                <button
                    class="exit tw-text-lighter-purple tw-m-0"
                    on:click={() => {
                        activeThreadStore.reset();
                    }}
                >
                    <ArrowLeftIcon />
                </button>
            </div>
            <div class="tw-text-center tw-pt-2 tw-pb-3">
                <div class="tw-flex tw-justify-center">
                    <b>{activeThread.name}</b>
                    {#if activeThread.type === "live"}
                        <div class="tw-block tw-relative tw-ml-7 tw-mt-1">
                            <span
                                class="tw-w-4 tw-h-4 tw-bg-pop-red tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-animate-ping"
                            />
                            <span
                                class="tw-w-3 tw-h-3 tw-bg-pop-red tw-block tw-rounded-full tw-absolute tw-right-0.5 tw-top-0.5"
                            />
                        </div>
                    {/if}
                </div>
                <div
                    class="tw-flex tw-flex-wrap tw-gap-x-1 tw-text-pop-green tw-cursor-pointer tw-items-center"
                    on:click={() => usersListViewStore.set(!$usersListViewStore)}
                >
                    <OnlineUsers {presenceStore} />
                    {#if $usersListViewStore}<EyeOffIcon size="13" />{:else}<EyeIcon size="13" />{/if}
                </div>
            </div>
            <div id="settings" class="tw-py-1 tw-w-14 tw-self-stretch tw-flex tw-justify-center tw-align-middle">
                <!--
            <button class="tw-text-lighter-purple tw-m-0">
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
            <div class="tw-flex tw-flex-col tw-flex-auto tw-w-full">
                <div
                    class="wa-message-bg tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-px-5 tw-pb-0.5"
                >
                    <button class="wa-action" type="button" on:click|stopPropagation={() => activeThread.reInitialize()}
                        ><RefreshCwIcon size="13" class="tw-mr-2" /> {$LL.reinit()}
                    </button>
                </div>
            </div>
        {/if}
    </div>
    {#if !$readyStore}
        <Loader text={$LL.loading()} />
    {:else if $usersListViewStore}
        <div class="tw-flex tw-flex-col tw-flex-auto tw-w-full">
            <div class="users wa-message-bg tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
                <p class="tw-px-5 tw-py-3 tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">
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
    <div class:tw-hidden={$usersListViewStore}>
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
