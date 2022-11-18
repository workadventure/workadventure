<script lang="ts">
    import { MucRoom } from "../Xmpp/MucRoom";
    import { User } from "../Xmpp/AbstractRoom";
    import ChatUser from "./ChatUser.svelte";
    import { ChevronUpIcon } from "svelte-feather-icons";
    import { fly } from "svelte/transition";
    import LL from "../i18n/i18n-svelte";
    import Loader from "./Loader.svelte";
    import { derived, Unsubscriber } from "svelte/store";
    import { shownRoomListStore } from "../Stores/ChatStore";
    import { onDestroy, onMount } from "svelte";

    export let mucRoom: MucRoom;
    export let searchValue: string;

    function showInviteMenu() {
        window.parent.postMessage({ type: "closeChat" }, "*");
        window.parent.postMessage({ type: "openInviteMenu" }, "*");
    }

    const loadingSubscribersStore = mucRoom.getLoadingSubscribersStore();
    const presenceStore = mucRoom.getPresenceStore();
    const me = derived(presenceStore, ($presenceStore) => $presenceStore.get(mucRoom.myJID));

    let unsubscribe: Unsubscriber;

    onMount(() => {
        unsubscribe = presenceStore.subscribe((usersList) => {
            const me = usersList.get(mucRoom.myJID);
            if (me && me.roomName && $shownRoomListStore === "") {
                shownRoomListStore.set(me.roomName);
            }
        });
    });

    onDestroy(() => {
        unsubscribe();
    });

    $: usersByMaps = [...$presenceStore.values()]
        .filter((user: User) => user.name.toLocaleLowerCase().includes(searchValue))
        .reduce((reduced, user: User) => {
            let group = "disconnected";
            if (user.roomName && user.active) {
                group = user.roomName;
            }
            if (!reduced.has(group)) {
                reduced.set(group, [user]);
            } else {
                const usersList = [...(reduced.get(group) ?? []), user];
                usersList.sort((a, b) => a.name.localeCompare(b.name));
                reduced.set(group, usersList);
            }
            return reduced;
        }, new Map<string, User[]>());

    $: roomSorted = [
        ...[...usersByMaps.keys()]
            .sort((a, b) => ($me && $me.roomName === a ? -1 : $me && $me?.roomName === b ? 1 : a.localeCompare(b)))
            .filter((roomName) => roomName !== "disconnected"),
        ...([...usersByMaps.keys()].find((roomName) => roomName === "disconnected") ? ["disconnected"] : []),
    ];
</script>

{#if [...$presenceStore.values()].filter((user) => !user.isMe && user.active).length === 0}
    <div
        class="tw-px-5 tw-py-4 tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple tw-text-sm tw-text-center"
    >
        <p>{$LL.roomEmpty()}</p>
        <button type="button" class="light tw-m-auto tw-cursor-pointer tw-px-3" on:click={showInviteMenu}>
            {$LL.invite()}
        </button>
    </div>
{/if}
{#if $loadingSubscribersStore}
    <Loader text={$LL.loadingUsers()} height="tw-h-40" />
{:else}
    {#each roomSorted as room}
        <div class="users tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple">
            <div class="tw-px-4 tw-py-1 tw-flex tw-items-center">
                {#if !$loadingSubscribersStore}
                    <span
                        class="{room !== 'disconnected'
                            ? 'tw-bg-light-blue'
                            : 'tw-bg-gray'} tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
                    >
                        {usersByMaps.get(room)?.length}
                    </span>
                {/if}
                <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">
                    {#if $me && $me.roomName === room}
                        {$LL.userList.isHere()}
                    {:else}
                        {room}
                    {/if}
                </p>
                <button
                    class="tw-text-lighter-purple"
                    on:click={() => shownRoomListStore.set($shownRoomListStore === room ? "" : room)}
                >
                    <ChevronUpIcon
                        class={`tw-transform tw-transition ${$shownRoomListStore === room ? "" : "tw-rotate-180"}`}
                    />
                </button>
            </div>
            {#if $shownRoomListStore === room}
                <div transition:fly={{ y: -30, duration: 100 }}>
                    {#if $loadingSubscribersStore}
                        <Loader text={$LL.loadingUsers()} height="tw-h-40" />
                    {:else}
                        {#if $me && room === $me.roomName}
                            <ChatUser {mucRoom} user={$me} {searchValue} />
                        {/if}
                        {#each (usersByMaps.get(room) ?? []).filter((user) => !user.isMe) as user}
                            <ChatUser {mucRoom} {user} {searchValue} />
                        {/each}
                    {/if}
                </div>
            {/if}
        </div>
    {/each}
{/if}
