<script lang="ts">
    import Header from "../Ui/Header.svelte";
    import { PlusIcon, UsersIcon, MessageSquareIcon } from "svelte-feather-icons";
    import { writable } from "svelte/store";
    import CreateRoom from "./CreateRoom.svelte";
    import { chatConnectionManager } from "../../../Connection/ChatConnectionManager";
    import Rooms from "../Wrapper/Rooms.svelte";
    import { selectedRoom } from "../../../Stores/MatrixStore";
    import Room from "./Room.svelte";
    import Button from "../Ui/Button.svelte";

    let createRoom = writable(false);
    let selectedTab = writable("chats");

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

{#if $selectedRoom}
    <Room roomWrapper={$selectedRoom} />
{:else}
    <Header />
    <div class="main" id="main">
        {#if !$isConnected}
            loading
        {:else if $createRoom}
            <CreateRoom
                close={() => {
                    createRoom.set(false);
                }}
            />
        {:else}
            <div class="buttons">
                <div class="tw-flex tw-justify-start tw-items-center tw-flex-wrap tw-gap-0.5">
                    <Button
                        text="Users"
                        onClick={() => selectedTab.set("users")}
                        icon={UsersIcon}
                        selected={$selectedTab === "users"}
                        iconSide="left"
                    />
                    <Button
                        text="Chats"
                        onClick={() => selectedTab.set("chats")}
                        icon={MessageSquareIcon}
                        selected={$selectedTab === "chats"}
                        iconSide="left"
                    />
                </div>
                <Button onClick={() => createRoom.set(true)} icon={PlusIcon} />
            </div>
            {#if $selectedTab === "users"}
                user
            {:else if $selectedTab === "chats"}
                <Rooms />
            {/if}
        {/if}
    </div>
{/if}

<style lang="scss">
    .main {
        @apply tw-relative tw-px-2;
        button {
            @apply tw-inline-flex tw-items-center tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-brand-blue tw-bg-white tw-border tw-border-b-lighter-purple tw-rounded-lg tw-cursor-pointer tw-shadow;
            &:hover {
                @apply tw-text-brand-blue;
            }
            &.selected {
                @apply tw-text-white tw-bg-brand-blue;
            }
            &.new {
                @apply tw-px-1;
            }
        }
    }

    .buttons {
        @apply tw-flex tw-justify-between tw-items-center;
        animation: slideInRight 200ms;
    }
</style>
