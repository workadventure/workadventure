<script lang="ts">
    import type { Teleport, TeleportStore, User, UserList, UsersStore } from "../../Xmpp/MucRoom";
    import LL from "../../i18n/i18n-svelte";
    import {
        walkAutomaticallyStore,
        canShare,
        getLink,
        copyLink,
        shareLink,
        updateInputFieldValue,
    } from "../../Stores/GuestMenuStore";
    import { USER_STATUS_DISCONNECTED } from "../../Xmpp/MucRoom";
    import { createEventDispatcher, onMount } from "svelte";
    import { searchValue } from "../../Stores/Utils/SearchStore";
    import { localUserStore } from "../../Connexion/LocalUserStore";

    export let usersListStore: UsersStore;
    let usersList: UserList = new Map<string, User>();

    export let teleportStore: TeleportStore;
    let teleport: Teleport = { state: false, to: null };

    const dispatch = createEventDispatcher();

    function goTo(type: string, roomId: string, uuid: string) {
        dispatch("goTo", { type, roomId, uuid });
    }

    onMount(() => {
        usersListStore.subscribe((value: UserList) => {
            usersList = value;
        });
        teleportStore.subscribe((value: Teleport) => {
            teleport = value;
        });
    });

    //recreate user list
    searchValue.subscribe((value: string | null) => {
        usersList = new Map<string, User>();
        usersListStore.subscribe((users: UserList) => {
            for (const userName of users.keys()) {
                if (value == undefined || userName == undefined) {
                    continue;
                }
                if (
                    value == undefined ||
                    value == "" ||
                    userName.toLocaleLowerCase().indexOf(value.toLocaleLowerCase()) !== -1
                ) {
                    const userObject: User | undefined = users.get(userName);
                    if (userObject == undefined) {
                        continue;
                    }
                    usersList.set(userName, userObject);
                }
            }
        });
    });
</script>

<ul>
    {#if [...$usersListStore].length === 0}
        <p>This room is empty, copy this link to invite colleague or friend!</p>
        <input type="text" readonly id="input-share-link" class="link-url" value={getLink()} />
        {#if !canShare}
            <button type="button" class="nes-btn is-primary" on:click={copyLink}>{$LL.menu.invite.copy()}</button>
        {:else}
            <button type="button" class="nes-btn is-primary" on:click={shareLink}>{$LL.menu.invite.share()}</button>
        {/if}
        <label>
            <input
                type="checkbox"
                class="nes-checkbox is-dark"
                bind:checked={$walkAutomaticallyStore}
                on:change={() => {
                    updateInputFieldValue();
                }}
            />
            <span>{$LL.menu.invite.walkAutomaticallyToPosition()}</span>
        </label>
    {:else}
        {#each [...usersList] as [jid, user]}
            <li class={user.status} id={jid}>
                <div>
                    <div class="nick">
                        {#if user.nick.match(/\[\d*]/)}
                            <span>{user.nick.substring(0, user.nick.search(/\[\d*]/))}</span>
                            <span class="no">#{user.nick.match(/\[\d*]/).join().replace('[','').replace(']','')}</span>
                        {:else}
                            <span>{user.nick}</span>
                        {/if}
                    </div>
                    <div>
                        {#if teleport.state === true}
                            {#if teleport.to === user.uuid}
                                <button src="btn btn-primary">{$LL.muc.userList.teleporting()}</button>
                            {/if}
                        {:else if user.status === USER_STATUS_DISCONNECTED}
                            <button src="btn btn-primary" disabled>
                                {$LL.muc.userList.disconnected()}
                            </button>
                        {:else if user.isInSameMap === false}
                            <button
                                on:click={() => goTo("room", user.roomId, localUserStore.getLocalUser()?.uuid || "")}
                                src="btn btn-primary"
                            >
                                {$LL.muc.userList.teleport()}
                            </button>
                        {:else}
                            <button on:click={() => goTo("user", user.roomId, user.uuid)} src="btn btn-primary">
                                {$LL.muc.userList.walkTo()}
                            </button>
                        {/if}
                    </div>
                </div>
            </li>
        {/each}
    {/if}
</ul>

<style>
    ul {
        list-style: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.1' width='10' height='10'><circle id='green_circle' stroke='black' fill='%2364dd17' cx='5' cy='5' r='5' /></svg>");
    }
    ul li.disconnected {
        list-style: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.1' width='10' height='10'><circle id='red_circle' stroke='black'' fill='%23ff2138' cx='5' cy='5' r='5' /></svg>");
    }
    li {
        margin: 2px 0;
    }
    li div {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }
    ul li div.nick span.no{
        color: gray;
        font-size: 0.8rem;
        margin-left: 5px;
        margin-bottom: 1px;
    }
    ul li div.nick{
        align-items: flex-end;
    }
    button[disabled] {
        color: white;
    }
</style>
