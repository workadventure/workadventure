<script lang="ts">
    import { ChevronUpIcon } from "svelte-feather-icons";
    import { fly } from "svelte/transition";
    import { get, Unsubscriber, Writable } from "svelte/store";
    import { onDestroy, onMount } from "svelte";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { User } from "../Xmpp/AbstractRoom";
    import { LL } from "../i18n/i18n-svelte";
    import { enableChatDisconnectedListStore, shownRoomListStore } from "../Stores/ChatStore";
    import ChatUser from "./ChatUser.svelte";
    import Loader from "./Loader.svelte";

    export let mucRoom: MucRoom;
    export let searchValue: string;

    function showInviteMenu() {
        window.parent.postMessage({ type: "closeChat" }, "*");
        window.parent.postMessage({ type: "openInviteMenu" }, "*");
    }

    const loadingSubscribersStore = mucRoom.getLoadingSubscribersStore();
    const presenceStore = mucRoom.getPresenceStore();
    let me: Writable<User> | undefined = presenceStore.get(mucRoom.myJID);

    let unsubscribe: Unsubscriber;

    onMount(() => {
        unsubscribe = presenceStore.subscribe((usersList) => {
            me = usersList.find((users) => get(users).jid === mucRoom.myJID);
            if (me && get(me)) {
                const me_ = get(me);
                if (me_ && me_.roomName && $shownRoomListStore === "") {
                    shownRoomListStore.set(me_.roomName);
                }
            }
        });
    });

    onDestroy(() => {
        unsubscribe();
    });

    $: usersByMaps = $presenceStore
        .filter((user: Writable<User>) => get(user).name.toLocaleLowerCase().includes(searchValue))
        .reduce((reduced, user: Writable<User>) => {
            let group = "disconnected";
            const user_ = get(user);
            if (user_.roomName && user_.active) {
                group = user_.roomName;
            }
            if ((group === "disconnected" && $enableChatDisconnectedListStore) || group !== "disconnected") {
                if (!reduced.has(group)) {
                    reduced.set(group, [user]);
                } else {
                    const usersList = [...(reduced.get(group) ?? []), user];
                    usersList.sort((a: Writable<User>, b: Writable<User>) => get(a).name.localeCompare(get(b).name));
                    reduced.set(group, usersList);
                }
            }
            return reduced;
        }, new Map<string, Writable<User>[]>());

    $: roomSorted = [
        ...[...usersByMaps.keys()]
            .sort((a, b) => ($me && $me.roomName === a ? -1 : $me && $me.roomName === b ? 1 : a.localeCompare(b)))
            .filter((roomName) => roomName !== "disconnected"),
        ...([...usersByMaps.keys()].find((roomName) => roomName === "disconnected") ? ["disconnected"] : []),
    ];
</script>

{#if $presenceStore.filter((user) => !get(user).isMe && get(user).active).length === 0}
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
    {#each roomSorted as room (room)}
        <div class="users tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple">
            <div class="tw-px-4 tw-py-1 tw-flex tw-items-center">
                {#if !$loadingSubscribersStore}
                    <span
                        class="{room !== 'disconnected'
                            ? 'tw-bg-light-blue'
                            : 'tw-bg-gray'} tw-text-dark-purple tw-min-w-[20px] tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
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
                        {#if $me && room === $me.roomName && $me.name.toLocaleLowerCase().includes(searchValue)}
                            <ChatUser {mucRoom} user={$me} {searchValue} />
                        {/if}
                        {#each (usersByMaps.get(room) ?? []).filter((user) => !get(user).isMe) as user (get(user).jid)}
                            <ChatUser {mucRoom} user={get(user)} {searchValue} />
                        {/each}
                    {/if}
                </div>
            {/if}
        </div>
    {/each}
{/if}
