<script lang="ts">
    import { fly } from "svelte/transition";
    import { ArrowLeftIcon, RefreshCwIcon, EyeIcon, EyeOffIcon } from "svelte-feather-icons";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import LL from "../i18n/i18n-svelte";
    import { activeThreadStore, settingsViewStore, usersListViewStore } from "../Stores/ActiveThreadStore";
    import ChatUser from "./ChatUser.svelte";
    import ChatMessagesList from "./ChatMessagesList.svelte";
    import OnlineUsers from "./OnlineUsers.svelte";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { onDestroy } from "svelte";
    import Loader from "./Loader.svelte";
    import {SingleRoom} from "../Xmpp/SingleRoom";
    import {userStore} from "../Stores/LocalUserStore";
    import NeedLogin from "./NeedLogin.svelte";
    import AvailabilityStatus from "./AvailabilityStatus.svelte";

    export let activeThread: MucRoom | SingleRoom;

    const presenceStore = activeThread instanceof MucRoom ? activeThread.getPresenceStore() : undefined;
    let readyStore = activeThread.getRoomReadyStore();
    const me = activeThread.getMe();

    let messagesList: ChatMessagesList;
</script>

<!-- thread -->
<div
        id="activeThread"
        class="tw-flex tw-flex-col tw-h-full tw-min-h-full tw-over tw-w-full"
        transition:fly={{ x: 500, duration: 400 }}
>
    <div class="wa-thread-head">
        <div
                class="tw-border tw-border-transparent tw-border-r-light-purple tw-border-solid tw-py-1 tw-w-14 tw-border-t-0 tw-border-b-0 tw-self-stretch tw-flex tw-justify-center tw-align-middle"
        >
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
                {#if activeThread instanceof MucRoom && activeThread.type === "live"}
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
            {#if activeThread instanceof MucRoom}
                <div
                        class="tw-flex tw-flex-wrap tw-gap-x-1 tw-text-pop-green tw-cursor-pointer tw-items-center"
                        on:click={() => usersListViewStore.set(!$usersListViewStore)}
                >
                    <OnlineUsers {presenceStore} />
                    {#if $usersListViewStore}<EyeOffIcon size="13" />{:else}<EyeIcon size="13" />{/if}
                </div>
            {:else}
                <AvailabilityStatus status={activeThread.availabilityStatus} />
            {/if}
        </div>
        <div
                id="settings"
                class="tw-border tw-border-transparent tw-border-l-light-purple tw-border-solid tw-py-1 tw-w-14 tw-border-t-0 tw-border-b-0 tw-self-stretch tw-flex tw-justify-center tw-align-middle"
        >
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
    {#if !$readyStore}
        {#if activeThread instanceof SingleRoom && !$userStore.isLogged}
            <NeedLogin />
        {:else}
            <Loader text={$LL.loading()} />
        {/if}
    {:else}
        {#if $usersListViewStore}
            <div
                    in:fly={{ y: -100, duration: 100, delay: 200 }}
                    out:fly={{ y: -100, duration: 100 }}
                    class="tw-flex tw-flex-col tw-flex-auto tw-w-full"
            >
                <div
                        class="users tw-pt-16 wa-message-bg tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid"
                >
                    <p class="tw-px-5 tw-py-3 tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">
                        {$LL.users()}
                    </p>
                    {#each [...$presenceStore] as [_, user]}
                        <ChatUser mucRoom={activeThread} {user} searchValue="" />
                    {/each}
                </div>
            </div>
        {:else if $settingsViewStore}
            <div
                    in:fly={{ y: -100, duration: 100, delay: 200 }}
                    out:fly={{ y: -100, duration: 100 }}
                    class="tw-flex tw-flex-col tw-flex-auto tw-w-full"
                    style="margin-top: 52px"
            >
                <div
                        class="wa-message-bg tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-px-5 tw-pb-0.5"
                >
                    {#if $me && $me.isAdmin}
                        <button class="wa-action" type="button" on:click|stopPropagation={() => activeThread.reInitialize()}
                        ><RefreshCwIcon size="13" class="tw-mr-2" /> {$LL.reinit()}
                        </button>
                    {/if}
                </div>
                <div class="wa-message-bg tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-px-5">
                    <p class="tw-py-3 tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Chatzone</p>
                </div>
            </div>
        {/if}
        <div class:tw-hidden={$usersListViewStore} in:fly={{ y: 100, duration: 100, delay: 200 }} bind:this={messagesList}>
            <!--<ChatMessagesList mucRoom={activeThread} bind:this={messagesList} />-->

            <div class="messageForm" transition:fly={{ y: 100, duration: 100 }}>
                <ChatMessageForm activeThread={activeThread} on:scrollDown={messagesList.scrollDown} />
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
  .messageForm {
    position: fixed;
    bottom: 0;
    width: 100%;
  }
</style>
