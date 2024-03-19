<script lang="ts">
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
    <div class="bg-contrast/80 pb-4">
        <div class="text-center italic">{$LL.roomEmpty()}</div>
        <button type="button" class="m-auto btn btn-secondary btn-sm mt-3" on:click={showInviteMenu}>
            {$LL.invite()}
        </button>
    </div>
{/if}
{#if $loadingSubscribersStore}
    <Loader text={$LL.loadingUsers()} height="h-40" />
{:else}
    {#each roomSorted as room (room)}
        <div class="users bg-contrast/80 px-4 pb-4">
            <div
                class="group px-4 py-2 flex items-center transition-all border border-solid border-white/10 border-[1px] bg-contrast-800 hover:bg-contrast-900 select-none rounded"
                on:click={() => shownRoomListStore.set($shownRoomListStore === room ? "" : room)}
            >
                {#if !$loadingSubscribersStore}
                    <span
                        class="{room !== 'disconnected'
                            ? 'bg-secondary'
                            : 'bg-white/30'} min-w-[20px] h-5 mr-3 text-xs font-bold flex items-center justify-center rounded-full"
                    >
                        {usersByMaps.get(room)?.length}
                    </span>
                {/if}
                <div class="mb-0 flex-auto text-lg font-bold leading-5">
                    {#if $me && $me.roomName === room}
                        {$LL.userList.isHere()}
                    {:else}
                        {room}
                    {/if}
                </div>
                <button class="m-0 btn btn-sm btn-white btn-ghost !pr-0">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler icon-tabler-chevron-up transition-all {$shownRoomListStore === room
                            ? ''
                            : 'rotate-180'}"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="#ffffff"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M6 15l6 -6l6 6" />
                    </svg>
                </button>
            </div>
            {#if $shownRoomListStore === room}
                <div class="pt-2 pb-4" transition:fly={{ y: -30, duration: 100 }}>
                    {#if $loadingSubscribersStore}
                        <Loader text={$LL.loadingUsers()} height="h-40" />
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
