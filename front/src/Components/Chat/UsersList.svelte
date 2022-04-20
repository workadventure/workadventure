<script lang="ts">
    import type { User, UserList, UsersStore } from "../../Xmpp/MucRoom";
    import LL from "../../i18n/i18n-svelte";
    import {
        walkAutomaticallyStore,
        canShare,
        getLink,
        copyLink,
        shareLink,
        updateInputFieldValue,
    } from "../../Stores/GuestMenuStore";
    import { goToWorkAdventureRoomId } from "../../Xmpp/MucRoom";
    import { onMount } from "svelte";
    import { searchValue } from "../../Stores/Utils/SearchStore";

    export let usersListStore: UsersStore;
    let usersList: UserList = new Map<string, User>();

    onMount(() => {
        usersListStore.subscribe((value: UserList) => {
            usersList = value;
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
                if (userName.toLocaleLowerCase().indexOf(value.toLocaleLowerCase()) !== -1) {
                    const userObject: User | undefined = users.get(userName);
                    if (userObject == undefined) {
                        continue;
                    }
                    usersList.set(value, userObject);
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
            <span>{$LL.menu.invite.walk_automatically_to_position()}</span>
        </label>
    {:else}
        {#each [...$usersListStore] as [userName, user]}
            <li class={user.status}>
                <div>
                    <span>{userName}</span>
                    <div>
                        {#if user.isInSameMap === false}
                            <button src="btn btn-primary" disabled>
                                {$LL.muc.userList.isHere()}
                            </button>
                        {:else}
                            <button
                                on:click={(event) => goToWorkAdventureRoomId(user.roomId, event)}
                                src="btn btn-primary"
                            >
                                {$LL.muc.userList.teleport()}
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
    li div {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }
</style>
