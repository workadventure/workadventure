<script lang="ts">
    import { MucRoom } from "../Xmpp/MucRoom";
    import { User } from "../Xmpp/AbstractRoom";
    import ChatUser from "./ChatUser.svelte";
    import { createEventDispatcher } from "svelte";
    import { ChevronUpIcon } from "svelte-feather-icons";
    import { fly } from "svelte/transition";
    import LL from "../i18n/i18n-svelte";
    import Loader from "./Loader.svelte";
    import { derived } from "svelte/store";
    const dispatch = createEventDispatcher<{ showUsers: undefined }>();

    export let mucRoom: MucRoom;
    export let showUsers: boolean;
    export let searchValue: string;

    let minimizeUser = true;
    const maxUsersMinimized = 7;

    function showInviteMenu() {
        window.parent.postMessage({ type: "closeChat" }, "*");
        window.parent.postMessage({ type: "openInviteMenu" }, "*");
    }

    const loadingSubscribersStore = mucRoom.getLoadingSubscribersStore();
    const presenceStore = mucRoom.getPresenceStore();
    $: usersList = [...$presenceStore.values()] as Array<User>;
    const me = derived(presenceStore, ($presenceStore) => $presenceStore.get(mucRoom.myJID));

    $: usersByMaps = usersList
        .filter((user: User) => user.name.toLocaleLowerCase().includes(searchValue))
        .reduce((reduced, user: User, index) => {
            if ((minimizeUser && index < maxUsersMinimized) || !minimizeUser) {
                let group = user.roomName ?? "ZZZZZZZZZZ-disconnected";
                if (!reduced.has(group)) reduced.set(group, [user]);
                else {
                    const usersList = [...(reduced.get(group) ?? []), user];
                    usersList.sort((a, b) => a.name.localeCompare(b.name));
                    reduced.set(group, usersList);
                }
            }
            return reduced;
        }, new Map<string, User[]>());

    $: roomSorted = [...usersByMaps.keys()].sort((a, b) =>
        $me && $me.roomName === a ? -1 : $me && $me?.roomName === b ? 1 : a.localeCompare(b)
    );
</script>

<div id="users" class="users tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple">
    <div class="tw-px-4 tw-py-1 tw-flex tw-items-center">
        {#if !$loadingSubscribersStore}
            <span
                class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
            >
                {usersList.filter((user) => user.active).length}
            </span>
        {/if}
        <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">
            {$LL.users()}
        </p>
        <button class="tw-text-lighter-purple" on:click={() => dispatch("showUsers")}>
            <ChevronUpIcon class={`tw-transform tw-transition ${showUsers ? "" : "tw-rotate-180"}`} />
        </button>
    </div>
    {#if showUsers}
        <div transition:fly={{ y: -30, duration: 100 }}>
            {#if $loadingSubscribersStore}
                <Loader text={$LL.loadingUsers()} height="tw-h-40" />
            {:else}
                {#each roomSorted as room}
                    {#each usersByMaps.get(room) ?? [] as user}
                        <ChatUser {mucRoom} {user} {searchValue} />
                    {/each}
                {/each}
                {#if usersList.filter((user) => !user.isMe).length === 0}
                    <div
                        class="tw-mt-2 tw-px-5 tw-py-4 tw-border-t tw-border-solid tw-border-0 tw-border-transparent tw-border-t-light-purple"
                    >
                        <p>{$LL.roomEmpty()}</p>
                        <button
                            type="button"
                            class="light tw-m-auto tw-cursor-pointer tw-px-3"
                            on:click={showInviteMenu}
                        >
                            {$LL.invite()}
                        </button>
                    </div>
                {/if}
            {/if}
        </div>
        {#if [...usersByMaps.values()].flat().length > maxUsersMinimized}
            <div class="tw-px-2 tw-mb-1  tw-flex tw-justify-end" on:click={() => (minimizeUser = !minimizeUser)}>
                <button class="tw-underline tw-text-sm tw-text-lighter-purple tw-font-condensed hover:tw-underline">
                    {$LL.see()}
                    {minimizeUser ? $LL.more() : $LL.less()} …
                </button>
            </div>
        {/if}
    {/if}
</div>
