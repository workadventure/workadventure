<script lang="ts">
    import Header from "./Header.svelte";
    import {PlusIcon, UsersIcon, MessageSquareIcon} from "svelte-feather-icons";
    import {writable} from "svelte/store";
    import CreateRoom from "./CreateRoom.svelte";
    import {chatConnectionManager} from "../../Connection/ChatConnectionManager";
    import Rooms from "./Rooms.svelte";

    let createRoom = writable(false);
    let selectedTab = writable('chats');

    const isConnected = chatConnectionManager.isConnected;

    /*
    function createRoom() {
        const modal = new Modal({
            target: document.querySelector('#main'),
            props: {
                onClose: () => modal.$destroy(),
                component: CreateRoom
            }});
    }
     */
</script>

<Header />
<div class="main" id="main">
    {#if !$isConnected}
        loading
    {:else}
        {#if $createRoom}
            <CreateRoom close={() => {createRoom.set(false)}}/>
        {:else}
            <div class="tw-flex tw-justify-between tw-items-center">
                <div class="tw-flex tw-justify-start tw-items-center tw-flex-wrap tw-gap-0.5">
                    <button type="button" on:click={() => selectedTab.set('users')} class={`${$selectedTab === 'users'?'selected':''}`}>
                        <UsersIcon class="tw-mr-1"/>
                        <span>Users</span>
                    </button>
                    <button type="button" on:click={() => selectedTab.set('chats')} class={`${$selectedTab === 'chats'?'selected':''}`}>
                        <MessageSquareIcon class="tw-mr-1"/>
                        <span>Chat</span>
                    </button>
                </div>
                <button class="new" on:click|stopPropagation={() => {createRoom.set(true)}}>
                    <PlusIcon />
                </button>
            </div>
            {#if $selectedTab === 'users'}
                user
            {:else if $selectedTab === 'chats'}
                <Rooms />
            {/if}
        {/if}
    {/if}
</div>

<style lang="scss">
  .main {
    @apply tw-relative tw-px-4;
    button{
      @apply tw-inline-flex tw-items-center tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-brand-blue tw-bg-white tw-border tw-border-b-lighter-purple tw-rounded-lg tw-cursor-pointer tw-shadow;
      &:hover{
        @apply tw-text-brand-blue;
      }
      &.selected{
        @apply tw-text-white tw-bg-brand-blue;
      }
      &.new{
        @apply tw-px-1;
      }

    }
  }

  @keyframes width {
    0% {
      width: 100%;
    }
    100% {
      width: 0%;
    }
  }
</style>