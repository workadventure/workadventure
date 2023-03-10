<script lang="ts">
    import Header from "./Header.svelte";
    import {PlusIcon, UserIcon, UsersIcon, MessageSquareIcon} from "svelte-feather-icons";
    import {get, writable} from "svelte/store";
    import CreateRoom from "./CreateRoom.svelte";
    import {chatConnectionManager} from "../../Connection/ChatConnectionManager";
    import Line from "./Line.svelte";

    let createRoom = writable(false);
    let selectedTab = writable('users');

    const isConnected = chatConnectionManager.isConnected;
    const rooms = chatConnectionManager.connectionOrFail.rooms;

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

<Header title="WorkAdventure chat" />
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
                        <UserIcon class="tw-mr-1"/>
                        <span>Chats</span>
                    </button>
                    <button type="button" on:click={() => selectedTab.set('groups')} class={`${$selectedTab === 'groups'?'selected':''}`}>
                        <MessageSquareIcon class="tw-mr-1"/>
                        <span>Groups</span>
                    </button>
                </div>
                <button class="new" on:click|stopPropagation={() => {createRoom.set(true)}}>
                    <PlusIcon />
                </button>
            </div>
            {#each $rooms as room}
                <Line text={get(room).name} />
            {/each}
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